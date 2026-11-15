// Backend client and the "I confirm" check (no network: fetch is faked).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BackendError, callIdFor, createBackend, isConfirmation } from '../backend.mjs';

test('isConfirmation: only a clear, unnegated "confirm"', () => {
  for (const yes of ['I confirm', 'i confirm.', 'Confirm', 'Yes, I confirm!', 'Yeah I confirm it', 'Okay, confirm.', 'I hereby confirm', 'I confirmed']) {
    assert.ok(isConfirmation(yes), yes);
  }
  for (const no of ["I don't confirm", 'I do not confirm', 'I can’t confirm', 'Can I confirm later?', 'How do I confirm?',
    'yes', 'sure', 'I will confirm if I can', 'maybe confirm', 'No, confirm nothing', 'Should I confirm', '', null]) {
    assert.ok(!isConfirmation(no), String(no));
  }
});

test('callIdFor: chert_call from room metadata, else the room name', () => {
  assert.equal(callIdFor({ metadata: JSON.stringify({ chert_call: 'abc-123', chert_bridge_ready: true }), name: 'room' }), 'abc-123');
  assert.equal(callIdFor({ metadata: 'not json', name: 'room-7' }), 'room-7');
  assert.equal(callIdFor({ metadata: '', name: 'room-8' }), 'room-8');
});

function fakeFetch(handler) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : undefined });
    const { status = 200, body = {} } = handler(url, init) ?? {};
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  return { impl, calls };
}

test('sends the token header and the card fields', async () => {
  const f = fakeFetch(() => ({ body: { valid: true, reason: 'valid', card_id: 'TX-RN-1001' } }));
  const b = createBackend({ baseUrl: 'http://127.0.0.1:8000/', token: 'secret-token', fetchImpl: f.impl });
  assert.ok(b.enabled);
  const reading = { card_present: true, header_says_triagex_demo: true, card_id: 'TX-RN-1001', name: 'Avery (fictional RN)', role: 'Registered Nurse · Emergency', availability: 'AVAILABLE', shift: null, confidence: 0.99 };
  const res = await b.cardCheck('call-1', reading);
  assert.equal(res.valid, true);
  assert.equal(f.calls[0].url, 'http://127.0.0.1:8000/api/agent/card-check');
  assert.equal(f.calls[0].init.headers['x-triagex-agent-token'], 'secret-token');
  assert.deepEqual(f.calls[0].body, { call_id: 'call-1', card_id: 'TX-RN-1001', name: 'Avery (fictional RN)', role: 'Registered Nurse · Emergency', availability: 'AVAILABLE', confidence: 0.99 });
});

test('no open request (404) is null; a refused confirmation (409) is returned, not thrown', async () => {
  const f = fakeFetch(url => url.endsWith('/active-request')
    ? { status: 404, body: { detail: 'No open staffing request' } }
    : { status: 409, body: { detail: { confirmed: false, reason: 'no_prior_check', message: 'Card TX-RN-1001 has no recent card check on this call.' } } });
  const b = createBackend({ token: 't', fetchImpl: f.impl });
  assert.equal(await b.activeRequest(), null);
  const res = await b.confirm('call-1', 'TX-RN-1001');
  assert.equal(res.confirmed, false);
  assert.equal(res.reason, 'no_prior_check');
  assert.equal(f.calls[1].body.verbal_confirmation, 'I confirm');
});

test('wrong token (401) and an unreachable backend throw BackendError', async () => {
  const b401 = createBackend({ token: 'bad', fetchImpl: fakeFetch(() => ({ status: 401, body: { detail: 'Invalid or missing agent token' } })).impl });
  await assert.rejects(b401.activeRequest(), e => e instanceof BackendError && e.status === 401);
  const down = createBackend({ token: 't', fetchImpl: async () => { throw new TypeError('fetch failed'); } });
  await assert.rejects(down.cardCheck('c', { card_id: 'X' }), e => e instanceof BackendError && e.code === 'unreachable');
  assert.equal(createBackend({ token: '' }).enabled, false);
});
