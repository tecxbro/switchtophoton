# Outbound FaceTime calls

Click the ladybug and select **Request help** to call the server's `EMERGENCY_NUMBER` using this computer's
screen with a face inset and microphone. **Hang up** stops local capture immediately and asks the
server to end the call. No AI model or model-provider API key is needed.

## Credentials and environment

Provider credentials belong only in `apps/server/.env`:

- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` from one LiveKit project.
- `CHERT_API_KEY` with `facetime:read` and `facetime:write` access.
- `CHERT_PROJECT_ID` and its assigned `CHERT_LINE_ID`.
- `EMERGENCY_NUMBER` in international format, including `+` and country code.

The desktop needs no call settings of its own. It calls as the Computerbug account
it is signed in to, on the same server. The account must be approved, and an
admin has to turn on calls for it under **Users** in the admin UI. Calls are off
by default because they ring a real phone and incur provider charges. Turning
calls off, turning the account down or deleting it hangs up that account's
call and drops its support stream.

The renderer passes its session token and server URL to the Electron main
process, which makes every call request. Remote servers must use HTTPS; HTTP is
allowed only on loopback for local development. Signing out, or in as someone
else, hangs up the previous account's call.

For Compose hosting, set the provider variables in the root deployment
environment (or the host's secret settings); `compose.yaml` passes them only to
the server. The local values in `apps/server/.env` are not
uploaded or deployed automatically. Deployments require approval.

## Call flow

The desktop requests a call from `/api/calls/prepare` using its account's
session token. The server authenticates it, creates the LiveKit room, and returns a
five-minute, room-scoped participant token. The desktop joins the room and
publishes one composite camera video track (screen plus optional face inset) and one microphone track, then asks the server to dial. The server
waits up to five seconds for LiveKit to confirm both tracks and places the
outbound Chert call to its configured destination. The desktop cannot choose
another phone number, project, line, room, or bridge token.

Provider API calls, token signing, status polling, retries, and room cleanup
all run on the server. Only the assigned room token and safe call status reach
the renderer. Microphone samples stay silent until Chert reports `bridge_ready`.

Every call endpoint requires an approved, signed-in account with calls turned
on, even during local use. Call state and operations are isolated between
accounts. The
server accepts one call at a time for its configured line, rate limits new
attempts, and deduplicates repeated prepare requests. The desktop checks status
every second; if it disconnects, it stops capture and retries hang-up. The server
also ends sessions after 30 seconds without authenticated client check-ins.

Call state is held in memory: run one server process/replica per configured
line. Planned shutdown attempts call cleanup, but a hard server crash cannot
recover active calls automatically. Multi-replica operation and durable crash
recovery require a shared session store. LiveKit and Chert usage may incur
provider charges; this adapter makes no model API requests.

## Screen sharing and permissions

Both **Request help** and an emergency contact's SUPPORT message automatically
start screen sharing. Computerbug selects the primary full-screen source when its
display ID is available, otherwise the first source. Under Wayland, it uses the
source returned by the PipeWire portal. Computerbug adds no display picker; the OS
portal may still require approval or source selection and cannot be bypassed.
Wayland needs PipeWire and a compatible desktop portal. On macOS, enable
Computerbug under **System Settings → Privacy & Security → Screen Recording**;
microphone and camera permissions are requested independently.

The screen fills the outgoing video at its original aspect ratio, capped at
1920×1080 without upscaling, at 15 fps. The cropped face inset sits at the bottom
right, at 22% of the output width. A screen-sharing indicator appears during
capture; there is no local screen preview. Camera denial or loss shows
“Camera unavailable; sharing screen only.” Screen or microphone failure prevents
dialing; losing either during the call ends it. Microphone samples remain silent
until `bridge_ready`. Incoming FaceTime audio and video still play in the panel.
Screen sharing starts once a screen frame is available. A slow camera adds its
inset when ready without changing the output dimensions; if it produces no frame
within five seconds, the call continues with screen and microphone alone.
Capture and canvas rendering continue when the overlay is hidden or unfocused.
Hang-up, cancellation, sign-out, renderer teardown, and connection failure release
all capture tracks, rendering timers, media elements, and the audio context.

The preload source request and Electron `media` / `display-capture` permissions
are restricted to the overlay main frame and the selected call in its ready
phase, with another call check after OS dialogs complete. The renderer uses
Electron desktop `getUserMedia` constraints, so SUPPORT messages do not depend
on browser click activation. No additional LiveKit screen-share track, system
audio, screen-switching control, remote input, or virtual camera is used.
See [Electron capture permissions](https://www.electronjs.org/docs/latest/api/session)
and [platform notes](https://www.electronjs.org/docs/latest/api/desktop-capturer).

## Development and verification

Start the normal backend dependencies with `npm run services:up` if needed.
Use `npm run dev:overlay` for overlay mode or `npm run dev` for an explicitly
requested development window. The desktop no longer runs a privileged inbound
agent worker or requires `chert dev`; outbound calls go through Computerbug's server.
Screen, camera, and microphone capture begins only when **Request help** is selected or a valid emergency-contact SUPPORT reply arrives.

```sh
npm test
npm run typecheck
npm run lint
npm run build -w @ladybug/desktop
```

With the server running and a recipient configured, sign the pet in to an
approved account and turn on its calls in the admin UI. Then:

1. Click the ladybug and select **Request help**, grant device access, and answer on the recipient's phone.
2. Confirm the phone sees readable screen content and a moving face inset in the bottom-right corner, and hears its microphone after
   Chert reports `bridge_ready`.
3. Confirm Computerbug plays the recipient's audio and displays available video.
4. Press **Hang up** and verify capture stops immediately. Wait for cleanup and repeat.
5. End the call on the phone and verify Computerbug stops capture.
6. Repeat using an emergency contact's SUPPORT message, without clicking the overlay.
7. Deny camera access: verify screen and microphone continue and the screen-only message appears.
   Stop the camera during a call and confirm the inset disappears without ending the call.
8. Deny screen or microphone access, or cancel the Wayland portal: verify no dialing and an actionable error.
   Cancel while an OS dialog is open and verify late approval never starts capture or dialing.
9. Hide the overlay and move focus away: verify the screen and face continue moving on the phone.
   Repeat with widescreen and portrait displays and resolution changes.
10. Disconnect the desktop from the server and verify local capture stops and
   the server ends the unattended call after its lease expires.

The renderer controller is `src/calls/controller.ts`, the desktop HTTP transport
is `electron/call-service.ts`, and the provider lifecycle lives in
`apps/server/src/calls/`.

## Risky-site alerts and remote support

Computerbug uses Chert's **shared-line texts**, authenticated with the same server-only
`CHERT_API_KEY`, `CHERT_PROJECT_ID`, and `CHERT_LINE_ID` as FaceTime. The fixed
`EMERGENCY_NUMBER` is also shared. No tenant slug, messaging signing secret, or
webhook subscription is needed for this product.

Open **app.trychert.com → Messages** in the Ladybug project. From the emergency
contact's phone, text `join <code>` to the line using the join code shown there.
The phone must register before the project can exchange texts with it.

Shared-line contract, checked against the live API:

- `POST https://app.trychert.com/api/v1/shared-messages` with
  `{ "line_id": "...", "recipient": "+15551234567", "text": "..." }`.
- Send the project API key as `Authorization: Bearer ftk...`, the project UUID as
  `X-Chert-Project-Id`, and a stable `Idempotency-Key` for every POST retry.
- Poll GET on the same endpoint for the newest 50 messages. There is currently
  no shared-line text webhook.

A successful POST returns `{ data: { id, state: "sent" } }`; queued sends return
their message ID and current state for polling.

The live GET returns `{ data: { items, total, limit, offset } }`; rows include
`id`, `line_id`, `direction`, `state`, `masked_recipient`, `created_at`, and `text`.
Computerbug polls every 15 seconds. More than 50 messages between polls can cause
messages to be missed; the endpoint provides no durable event cursor here.

Browser visits to known unsafe sites and analyses finding unsafe sites queue:

```text
Computerbug warning: The user is accessing a website that might not be trustworthy:
{url}

Reply within 30 minutes:
SUPPORT: Start or restart a remote FaceTime support call.
KILL: Force-close Google Chrome on all connected computers on this account.
SHUTDOWN: Shut down all connected computers on this account. Unsaved work may be lost.
```

URLs have credentials and fragments removed. Admin checks and manual scans alone
do not message anyone. Redis reserves one notification per normalized hostname
per account per hour, including concurrent visits and server restarts. Subdomains
have separate limits. The durable outbox retries transient POST failures up to five
times with the same idempotency key. Accepted pending sends retain their returned message ID
and are checked through GET without creating another send. Only `state: sent`
opens a support window; pending/unknown states do not establish delivery.
Messaging failures do not interrupt site checks or pet alerts.

A confirmed send opens a 30-minute support window scoped to the project, line,
and emergency contact, retaining the originating account. Only inbound `received`
text equal to SUPPORT, KILL, or SHUTDOWN (ignoring case and surrounding whitespace) is eligible.
Both the message's `created_at` and the polling receipt must fall inside the window. IDs are deduplicated in
Redis atomically; distinct replies keep the original window open without extending
its expiry. SUPPORT can restart an ended call; SUPPORT replies during an active or ending
call are ignored without queuing. Messages predating server startup are ignored.
When windows overlap, the newest confirmed alert preceding the reply determines
the destination account. Legacy jobs and windows without an account are ignored.

**Sender matching:** shared-line GET currently masks phone numbers as `•••1234`.
The deployment owner accepts matching the last four digits of registered senders
to `EMERGENCY_NUMBER`. This is not a full-number identity check: registered phones
sharing those digits cannot be distinguished. Full unmasked numbers, if returned,
are compared exactly. No phone number or private message text is written to logs.

SUPPORT reaches the originating account's most recently connected eligible
desktop through an authenticated main-process SSE connection. KILL and SHUTDOWN reach all
eligible connected desktops for that account, even during calls or after leaving
the unsafe page. Approval and calls-enabled access are required for all commands;
sign-out, access revocation, and subscription shutdown stop further execution.
Expired events are discarded by desktops. Older desktops ignore unknown command types. SHUTDOWN event IDs are deduplicated
in the desktop main process before OS execution, including across subscription restarts.

KILL runs `/usr/bin/pkill` without a shell, using `-KILL`, the current OS UID,
and an exact process-name match: `chrome` on Linux, `Google Chrome` on macOS.
Only stable Google Chrome is targeted; all its windows for that OS user close,
possibly losing unsaved work. Computerbug and its call continue running. Missing Chrome
is a successful no-op, and other platforms do nothing. No confirmation or reply
message is sent.

SHUTDOWN powers off every eligible connected Linux or macOS computer on that
account, including during support calls. Unsaved work may be lost and calls end
when the computer powers off. Windows ignores SHUTDOWN. There is no local save
prompt, remote confirmation, or password prompt; missing setup and execution
failures produce a local `[support] device shutdown failed` error.

An administrator must enable shutdown once on **each computer**, for the local
non-root user running Computerbug. From this repository:

```sh
sudo sh apps/desktop/scripts/install-shutdown.sh LOCAL_USERNAME
# To remove the permission later:
sudo sh apps/desktop/scripts/uninstall-shutdown.sh LOCAL_USERNAME
```

Desktop releases include the three scripts under `resources/shutdown-setup`
(`Computerbug.app/Contents/Resources/shutdown-setup` on macOS; beside the app
inside the extracted AppImage on Linux). Run the same install/uninstall scripts
there with `sudo sh /path/to/shutdown-setup/install-shutdown.sh LOCAL_USERNAME`.
Keep the scripts together. Uninstall before changing the authorized user or
reinstalling the rule. Removing the app alone does not remove the sudoers rule.

Setup requires sudo, `/usr/sbin/visudo`, an active `/etc/sudoers.d` include, and
the platform shutdown executable. It installs a root-owned mode-0440 rule at
`/etc/sudoers.d/computerbug-shutdown-LOCAL_USERNAME`, validates the rule and the
full configuration, confirms the rule was included, and lists effective command
permission without executing shutdown. Failed installation removes its rule.
Only that user receives passwordless root permission for the exact command:
Linux `/usr/bin/systemctl poweroff --force`, macOS `/sbin/shutdown -h now`.
This permission is available to other processes running as that local user too.
Existing administrator grants are unaffected by removal.

The desktop uses fixed arguments with `execFile` and `/usr/bin/sudo -n`.
Linux uses one `--force`, terminating processes while retaining filesystem
shutdown handling ([systemctl documentation](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html)).
macOS uses `shutdown -h now`, bypassing application save prompts.

A desktop must already have been connected when the reply was recorded. Offline
requests are discarded and reconnects have no backlog. Busy calls ignore additional
SUPPORT requests. Keep one server process per call line, as required by the existing
call lifecycle.

Clicking the ladybug opens a menu above it with **Request help**, **Scan clipboard
URL**, and **View report** when available. Arrow keys and Tab move through items;
Escape closes the menu. Dragging and the right-click menu remain available.
During a call the ladybug holds still and shows a speech bubble with the call
status, **Hang up**, and the caller's video, sized to fill much of the screen.
Black bars the call bridge adds around the phone's picture (above and below, or
left and right) are detected from sampled frames and cropped away. "Call ended"
fades after a few seconds; errors stay until dismissed. Blocked-page warnings
wait until the call bubble closes. Media elements stay mounted for remote
requests. First use may prompt for permissions; permission failures appear in
the bubble without redial.

For Redis integration tests, use a dedicated disposable Redis/Valkey database:

```sh
TEST_REDIS_URL=redis://localhost:16379/15 npm test -w @ladybug/server
```

These tests clear that database. For acceptance after the emergency phone joins,
visit a known unsafe URL, verify the message, reply SUPPORT, and confirm exactly
one desktop starts one call after polling. End the call, reply SUPPORT again
within the same window, and confirm a new call starts. On Linux and macOS, send
KILL during a support call and after navigating away; confirm Chrome closes on
all connected computers for that account while Computerbug and the call continue.
Check duplicate/expired replies,
wrong line or last-four digits, outbound texts, busy calls and offline/reconnected
desktops. Automated capture tests cover selection, call/frame authorization, cancellation,
composition geometry, camera fallback, required-device failures, cleanup, publication
ordering, and microphone gating. Real portal/device permissions and FaceTime delivery
on Wayland and macOS remain manual checks.

Test SHUTDOWN acceptance only on disposable Linux and macOS machines: install
setup, send SHUTDOWN during a call and after leaving the page, and confirm all
eligible account computers power off. Check another account stays online. After
restarting, verify offline/duplicate/expired replies do not execute; uninstall
setup and verify a fresh reply logs a permission failure without prompting.
Never run actual power-off acceptance tests on a development workstation.
