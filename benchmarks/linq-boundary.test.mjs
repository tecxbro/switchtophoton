// Offline experiment, not a deployable migration or a Keiki simulator.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const head = '1326d04cd9bd15dde05216bbf689f2d11b42803f';
const repo = process.env.LINQ_FIXTURE_REPO;
assert.ok(repo, 'Set LINQ_FIXTURE_REPO to the upstream checkout at the pinned HEAD');
const git = (...args) => execFileSync('git', ['-C', resolve(repo), ...args], {encoding: 'utf8'});
assert.equal(git('rev-parse', 'HEAD').trim(), head);
const fixture = mkdtempSync(join(tmpdir(), 'keiki-linq-'));
const upstream = name => git('show', `${head}:src/webhook/${name}.ts`);
writeFileSync(join(fixture, 'types.ts'), upstream('types'));
// Node strips types but does not resolve post-build .js imports. Change imports only.
writeFileSync(join(fixture, 'handler.ts'), upstream('handler')
  .replace("import { Request, Response } from 'express';", '')
  .replace(/  (WebhookEvent|ExtractedMedia|MessageEffect|ReplyTo),\n/g, '')
  .replace("} from './types.js';", "} from './types.ts';"));
try {
  const { createWebhookHandler } = await import(pathToFileURL(join(fixture, 'handler.ts')));
  const agentId = 'fixture-agent', contact = '+12025550101', receivingLine = '+12025550102';
  const conversation = 'keiki-dm', oldChat = 'linq-chat';
  // Synthetic, externally verified routing premise. It is NOT inferred from a phone match.
  const migrationMap = new Map([[conversation, {oldChat, contact, receivingLine}]]);
  const secret = 'fixture-only-secret', timestamp = 1700000000;
  const origin = 'https://keiki.invalid';

  function sign(raw) {
    return createHmac('sha256', secret).update(`${timestamp}.`).update(raw).digest('hex');
  }

  function dispatch(overrides = {}) {
    return {type: 'keiki.turn', version: 1, agentId, turnId: 'turn-1',
      conversationId: conversation, channel: 'sms',
      messages: [{messageId: 'keiki-msg-1', text: 'hello', content: 'rendered prompt'}],
      keiki: {turnUrl: `${origin}/api/v1/turns/turn-1`}, ...overrides};
  }

  // Fixed capability slice: one agent's verified 1:1 text route. Any other shape is blocked.
  function challenge({ onMessage, post, accepted = new Set() }) {
    return async (raw, mac) => {
      assert.match(mac, /^[a-f0-9]{64}$/);
      assert.ok(timingSafeEqual(Buffer.from(sign(raw), 'hex'), Buffer.from(mac, 'hex')), 'bad signature');
      const {type, version, turnId, agentId: agent, conversationId, channel, messages, keiki, heldBack, silent, quietLoop} = JSON.parse(raw);
      assert.equal(type, 'keiki.turn');
      assert.equal(version, 1);
      assert.equal(agent, agentId, 'wrong agent');
      // Keiki identity channel for iMessage phone routes can be sms; this does not
      // prove the Apple transport. The fixture route is explicitly pre-classified.
      assert.equal(channel, 'sms', 'out-of-scope channel');
      assert.equal(keiki.turnUrl, `${origin}/api/v1/turns/${encodeURIComponent(turnId)}`, 'wrong turn URL');
      const binding = migrationMap.get(conversationId);
      assert.ok(binding, 'unknown conversation binding');
      if (accepted.has(turnId)) return 'duplicate';
      accepted.add(turnId); // Memory only: restart durability is NOT part of this proof.
      if (heldBack || silent || quietLoop) return post('complete', {status: 'completed'});
      try {
        for (const [index, m] of messages.entries()) {
          if (m.silent || !m.text.trim()) continue;
          assert.ok(!m.attachments?.length && !m.replyTo, 'out-of-scope media or reply');
          // Fake model callback receives only application input. The fixture intentionally
          // does not infer that an old Linq message ID equals a Keiki message ID.
          const response = await onMessage(binding.oldChat, binding.contact, m.text, binding.receivingLine);
          const outcome = await post('messages', {
            text: response, idempotencyKey: `${turnId}:message:${index}`,
          });
          if (outcome === 'unknown') throw new Error('delivery outcome unknown');
        }
      } catch (err) {
        await post('complete', {status: 'failed'});
        throw err;
      }
      return post('complete', {status: 'completed'});
    };
  }

  const run = (challengeFn, body) => {
    const raw = Buffer.from(JSON.stringify(body));
    return challengeFn(raw, sign(raw));
  };

  test('actual Linq webhook and Keiki slice call the same app-level text inputs', async () => {
    process.env.NODE_ENV = 'production';
    process.env.LINQ_AGENT_BOT_NUMBERS = receivingLine;
    process.env.ALLOWED_SENDERS = contact;
    process.env.IGNORED_SENDERS = '';
    const oldInputs = [], newInputs = [], posts = [];
    const old = createWebhookHandler(async (chat, from, message, id, images, audio, effect, reply, service, recipient) => {
      assert.deepEqual([images, audio, effect, reply, service], [[], [], undefined, undefined, 'iMessage']);
      oldInputs.push([chat, from, message, recipient]);
    });
    for (const [i, value] of ['hello', 'again'].entries()) {
      await old({body: {event_type: 'message.received', event_id: `e-${i}`,
        data: {chat_id: oldChat, from: contact, recipient_phone: receivingLine, service: 'iMessage',
          is_from_me: false, message: {id: `m-${i}`, parts: [{type:'text',value}]},
        }}}, {status: status => ({json: body => assert.deepEqual([status, body], [200,{received:true}])})});
    }
    const adapted = challenge({onMessage: async (...args) => {newInputs.push(args); return 'mock reply';},
      post: async (...args) => {posts.push(args);}});
    const body = dispatch({messages: [
      {messageId: 'k-1', text: 'hello', content: '[decorated one]'},
      {messageId: 'k-2', text: 'again', content: '[decorated two]'},
    ]});
    await run(adapted, body);
    assert.equal(await run(adapted, body), 'duplicate');
    assert.deepEqual(newInputs, oldInputs);
    assert.deepEqual(posts.map(([path]) => path), ['messages', 'messages', 'complete']);
    assert.deepEqual(posts.slice(0,2).map(([,data]) => data.idempotencyKey),
      ['turn-1:message:0', 'turn-1:message:1']);
  });

  test('wrong signature, agent, channel, origin and unmapped route yield no side effects', async () => {
    const noWork = () => assert.fail('unexpected transport or callback');
    const adapted = challenge({onMessage: noWork, post: noWork});
    await assert.rejects(adapted(Buffer.from(JSON.stringify(dispatch())), 'a'.repeat(64)), /bad signature/);
    for (const [override, error] of [
      [{agentId: 'other'}, /wrong agent/], [{channel: 'whatsapp'}, /out-of-scope channel/],
      [{conversationId: 'unknown'}, /unknown conversation binding/],
      [{keiki: {turnUrl: 'https://other.invalid/api/v1/turns/turn-1'}}, /wrong turn URL/],
    ]) await assert.rejects(run(adapted, dispatch(override)), error);
  });

  test('held-back, silent and quiet fixtures settle without a reply', async () => {
    for (const flag of ['heldBack', 'silent', 'quietLoop']) {
      const calls = [];
      await run(challenge({onMessage: () => assert.fail('unexpected callback'),
        post: async (...args) => { calls.push(args); }}), dispatch({[flag]: true}));
      assert.deepEqual(calls, [['complete', {status:'completed'}]]);
    }
  });

  test('unknown delivery fails once without generating a new send key', async () => {
    const calls = [];
    const adapted = challenge({onMessage: async () => 'reply',
      post: async (...args) => {calls.push(args); return 'unknown';}});
    await assert.rejects(run(adapted, dispatch()), /delivery outcome unknown/);
    assert.equal(await run(adapted, dispatch()), 'duplicate');
    assert.deepEqual(calls, [
      ['messages', {text:'reply', idempotencyKey:'turn-1:message:0'}],
      ['complete', {status:'failed'}],
    ]);
  });
} finally {
  rmSync(fixture, {recursive:true, force:true});
}
