import { fileURLToPath } from 'node:url';
import { AutoSubscribe, defineAgent, llm, voice } from '@livekit/agents';
import { realtime } from '@livekit/agents-plugin-openai';
import {
  LocalVideoTrack,
  RoomEvent,
  TrackKind,
  TrackSource,
  VideoBufferType,
  VideoFrame,
  VideoSource,
} from '@livekit/rtc-node';
import { collectBestFrames, followVideoTrack, framesToPdf } from './capture.mjs';
import { runAgent } from './chert-rooms.mjs';
import { drawBlank, drawFace, FPS, HEIGHT, WIDTH } from './face.mjs';
import { greetWhenFaceTimeReady } from './greet.mjs';
import { publishSilentMic } from './silent-audio.mjs';
import { synthesizeSpeechPcm16 } from './speak.mjs';
import {
  patientIdFromMetadata,
  requirementTitleFromMetadata,
  sessionIdFromMetadata,
  uploadCapturedPdf,
} from './upload.mjs';

const instructions = `You are Unburden's FaceTime document assistant on a video call.
Your only job is to help the patient get a paper or screen document into their chart.
Speak in short, clear sentences.
As soon as the call is ready, ask them to hold the document steady so it fills the camera.
When the document looks readable on camera, call the capture_document tool.
After a successful capture, tell them it was uploaded and they can hang up.
If capture fails, ask them to adjust lighting/angle and try once more.
You are an AI assistant, not a clinician.`;

const DEFAULT_GREETING_SAY =
  'Hi, thanks for calling Unburden. Please hold your document close so the text fills the camera.';

function openingSay(requirementTitle) {
  if (requirementTitle) {
    return `Hi, your care provider requests ${requirementTitle}. Please hold your document close so the text fills the camera.`;
  }
  return DEFAULT_GREETING_SAY;
}

function openingRealtimeInstructions(requirementTitle) {
  if (requirementTitle) {
    return `Greet the caller in one short sentence: say their care provider requests “${requirementTitle}” and ask them to hold that document up to the camera so the text fills the frame.`;
  }
  return 'Greet the caller in one short sentence: say you are Unburden’s document assistant and ask them to hold their document up to the camera, filling the frame.';
}

const openaiKeyReady = () => {
  const key = process.env.OPENAI_API_KEY || '';
  return Boolean(key) && !key.includes('YOUR_');
};

const agent = defineAgent({
  entry: async ctx => {
    // Subscribe to caller A/V; publish our own mic+camera BEFORE Chert dials.
    await ctx.connect(undefined, AutoSubscribe.SUBSCRIBE_ALL);

    const jobMetadata = ctx.job?.metadata || '{}';
    const patientId = patientIdFromMetadata(jobMetadata);
    const sessionId = sessionIdFromMetadata(jobMetadata);
    const requirementTitle = requirementTitleFromMetadata(jobMetadata);
    console.log(
      `[document-intake] identity=${ctx.room.localParticipant?.identity} patient=${patientId} session=${sessionId || 'none'} requirement=${requirementTitle || 'none'}`,
    );

    // Chert requires exactly one unmuted agent audio track to accept the participant.
    const mic = await publishSilentMic(ctx.room.localParticipant);

    const source = new VideoSource(WIDTH, HEIGHT);
    const videoTrack = LocalVideoTrack.createVideoTrack('agent-video', source);
    let tick = 0;
    let speaking = false;
    /** When true, publish a blank frame so FaceTime PiP does not cover the document. */
    let blankCamera = false;
    const paint = () =>
      source.captureFrame(
        new VideoFrame(
          blankCamera ? drawBlank() : drawFace(tick++, speaking),
          WIDTH,
          HEIGHT,
          VideoBufferType.RGBA,
        ),
      );
    paint();
    await ctx.room.localParticipant.publishTrack(videoTrack, { source: TrackSource.SOURCE_CAMERA });
    const timer = setInterval(paint, 1000 / FPS);
    console.log('[document-intake] published silent mic + camera');

    /** @type {ReturnType<typeof followVideoTrack> | null} */
    let videoFollow = null;
    let uploaded = false;

    const attachVideo = remoteTrack => {
      if (!remoteTrack || remoteTrack.kind !== TrackKind.KIND_VIDEO) return;
      if (videoFollow) void videoFollow.close();
      videoFollow = followVideoTrack(remoteTrack);
      console.log('[document-intake] following remote video track');
    };

    const ensureSubscribed = publication => {
      try {
        if (publication?.setSubscribed && !publication.isSubscribed) {
          publication.setSubscribed(true);
        }
      } catch (error) {
        console.warn('[document-intake] setSubscribed failed', error);
      }
    };

    for (const participant of ctx.room.remoteParticipants.values()) {
      for (const publication of participant.trackPublications.values()) {
        ensureSubscribed(publication);
        if (publication.track) attachVideo(publication.track);
      }
    }
    ctx.room.on(RoomEvent.TrackPublished, (publication, participant) => {
      console.log(
        `[document-intake] track published kind=${publication.kind} from=${participant.identity}`,
      );
      ensureSubscribed(publication);
    });
    ctx.room.on(RoomEvent.TrackSubscribed, (remoteTrack, _pub, participant) => {
      console.log(`[document-intake] track subscribed kind=${remoteTrack.kind} from=${participant.identity}`);
      attachVideo(remoteTrack);
    });

    /** Capture stays locked until the opening greeting has fully finished playing. */
    let captureAllowed = false;

    const say = async text => {
      speaking = true;
      try {
        const pcm = await synthesizeSpeechPcm16(text);
        await mic.playPcm16(pcm);
        // Trailing beat so the last words clear FaceTime before the next step.
        await new Promise(r => setTimeout(r, 600));
      } catch (error) {
        console.warn('[document-intake] speak failed', error);
        throw error;
      } finally {
        speaking = false;
      }
    };

    const waitForCallerVideo = async (timeoutMs = 45_000) => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        if (videoFollow?.getLatest()) return true;
        // Also re-scan publications in case we missed an event.
        for (const participant of ctx.room.remoteParticipants.values()) {
          for (const publication of participant.trackPublications.values()) {
            ensureSubscribed(publication);
            if (publication.track) attachVideo(publication.track);
          }
        }
        await new Promise(r => setTimeout(r, 500));
      }
      return Boolean(videoFollow);
    };

    const captureAndUpload = async () => {
      if (!captureAllowed) {
        return {
          ok: false,
          message: 'Still greeting the caller — capture is blocked until the greeting finishes.',
        };
      }
      if (uploaded) return { ok: true, message: 'Already uploaded a document on this call.' };
      if (!videoFollow) {
        return {
          ok: false,
          message: 'Caller video is not available yet. Ask them to enable FaceTime Video / camera.',
        };
      }
      console.log('[document-intake] capturing frames…');
      blankCamera = true;
      paint();
      // Let FaceTime swap the PiP to blank before we sample frames.
      await new Promise(r => setTimeout(r, 900));
      try {
        // One sharp page beats two FaceTime-chrome duplicates for OCR.
        const frames = await collectBestFrames(() => videoFollow.getLatest(), {
          durationMs: 10_000,
          count: 1,
          minScore: 40,
        });
        if (!frames.length) {
          return {
            ok: false,
            message: 'Could not get a clear frame. Ask the caller to hold the document closer and steadier.',
          };
        }
        const pdfBytes = await framesToPdf(frames);
        const document = await uploadCapturedPdf(pdfBytes, { patientId, sessionId });
        uploaded = true;
        console.log(`[document-intake] uploaded document ${document.id}`);
        return {
          ok: true,
          message: `Uploaded as “${document.source_label || document.original_filename}”.`,
          document_id: document.id,
          source_label: document.source_label,
        };
      } finally {
        blankCamera = false;
        paint();
      }
    };

    const shutdownMedia = async () => {
      clearInterval(timer);
      if (videoFollow) await videoFollow.close();
      await mic.stop();
      await videoTrack.close();
      await source.close();
    };

    if (!openaiKeyReady()) {
      console.warn(
        '[document-intake] OPENAI_API_KEY missing — using macOS say + capture mode.',
      );
      const stopGreeting = greetWhenFaceTimeReady(ctx.room, () => {
        console.log('[document-intake] FaceTime ready');
        void (async () => {
          try {
            // Let FaceTime media settle so the opening line is actually audible.
            await new Promise(r => setTimeout(r, 4_500));
            console.log('[document-intake] speaking greeting (capture locked)');
            await say(openingSay(requirementTitle));
            captureAllowed = true;
            console.log('[document-intake] greeting done — capture unlocked');

            const hasVideo = await waitForCallerVideo(45_000);
            if (!hasVideo) {
              await say('Sorry, I can’t see your camera. Please use FaceTime Video and try again.');
              // Stay on the line — do not hang up on the caller.
              return;
            }
            await say('Great — please hold still while I capture that.');
            let result = await captureAndUpload();
            if (!result.ok) {
              await say('Sorry, that was blurry. Please hold steady and I’ll try once more.');
              await new Promise(r => setTimeout(r, 2_000));
              result = await captureAndUpload();
            }
            console.log('[document-intake] capture result', result);
            if (result.ok) {
              await say('Got it — uploaded to your chart. Thanks! You can hang up now.');
              await new Promise(r => setTimeout(r, 2_000));
              ctx.shutdown('uploaded');
            } else {
              await say('Sorry, still unclear. Please hang up and ring again, or upload a PDF in the app.');
            }
          } catch (error) {
            console.warn('[document-intake] greeting/capture flow failed', error);
            captureAllowed = false;
          }
        })();
      });
      ctx.addShutdownCallback(async () => {
        stopGreeting();
        await shutdownMedia();
      });
      return;
    }

    // Conversational mode: keep the silent mic until realtime audio takes over is risky
    // (two audio pubs). For now keep silent mic as the single audio track and drive
    // speech via generateReply only if the realtime session reuses it; otherwise capture-only
    // is the reliable path. Start realtime for dialogue + tool calling.
    const session = new voice.AgentSession({
      llm: new realtime.RealtimeModel({ model: 'gpt-realtime', voice: 'marin' }),
    });
    session.on(voice.AgentSessionEventTypes.AgentStateChanged, event => {
      speaking = event.newState === 'speaking';
    });

    const captureTool = llm.tool({
      description:
        'Capture the document currently visible on the caller’s FaceTime camera and upload it to the Unburden patient chart as a PDF.',
      execute: async () => {
        const result = await captureAndUpload();
        return JSON.stringify(result);
      },
    });

    // Wait for the Chert bridge before attaching realtime input to it.
    const bridge = await new Promise((resolve, reject) => {
      const wanted = p => (p?.identity || '').startsWith('chert-bridge-');
      for (const p of ctx.room.remoteParticipants.values()) {
        if (wanted(p)) return resolve(p);
      }
      const onJoin = p => {
        if (!wanted(p)) return;
        clear();
        resolve(p);
      };
      const onGone = () => {
        clear();
        reject(new Error('Room disconnected while waiting for Chert bridge'));
      };
      const clear = () => {
        ctx.room.off(RoomEvent.ParticipantConnected, onJoin);
        ctx.room.off(RoomEvent.Disconnected, onGone);
      };
      ctx.room.on(RoomEvent.ParticipantConnected, onJoin);
      ctx.room.on(RoomEvent.Disconnected, onGone);
    });

    await session.start({
      room: ctx.room,
      agent: new voice.Agent({
        instructions,
        tools: { capture_document: captureTool },
      }),
      record: false,
      inputOptions: {
        participantIdentity: bridge.identity,
        audioEnabled: true,
        videoEnabled: true,
        textEnabled: false,
        closeOnDisconnect: true,
        deleteRoomOnClose: false,
      },
      // Avoid a second outbound audio publication colliding with the silent mic.
      outputOptions: { audioEnabled: false, transcriptionEnabled: false },
    });

    const stopGreeting = greetWhenFaceTimeReady(ctx.room, () => {
      void (async () => {
        await new Promise(r => setTimeout(r, 2_500));
        await session.generateReply({
          instructions: openingRealtimeInstructions(requirementTitle),
        });
        // Rough settle for realtime speech before unlocking capture / auto-capture.
        await new Promise(r => setTimeout(r, 8_000));
        captureAllowed = true;
        console.log('[document-intake] greeting window done — capture unlocked');
      })();
    });
    const stopAuto = greetWhenFaceTimeReady(ctx.room, () => {
      void (async () => {
        await new Promise(r => setTimeout(r, 22_000));
        if (!uploaded && captureAllowed) {
          console.log('[document-intake] auto-capture fallback');
          const result = await captureAndUpload();
          if (result.ok) {
            session.generateReply({
              instructions:
                'Tell the caller you captured and uploaded their document, and they can hang up now.',
            });
          }
        }
      })();
    });

    ctx.addShutdownCallback(async () => {
      stopGreeting();
      stopAuto();
      await session.close();
      await shutdownMedia();
    });
  },
});

export default agent;

runAgent(agent, {
  file: fileURLToPath(import.meta.url),
  agentName: process.env.AGENT_NAME || 'document-intake',
});
