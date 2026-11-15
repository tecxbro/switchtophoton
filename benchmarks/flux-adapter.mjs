// Synthetic, text-only turn worker, NOT a deployable ingress server.
// Transport accepts already authenticated/validated turns. No independent sending API.
export function createKeikiAdapter({onMessage, splitIntoMessages, post, origin, agentId, agent, binding}) {
  if (agent.onInit) throw new Error('INDEPENDENT_CALLBACKS_UNMAPPED');
  const processed = new Set(); // Fixture-only dedupe: not durable.
  return async function handle(turn, token) {
    if (turn.agentId !== agentId || new URL(turn.keiki.turnUrl).origin !== origin) throw new Error('BINDING');
    if (turn.type !== 'keiki.turn' || turn.version !== 1 || turn.messages.length === 0) throw new Error('SHAPE');
    if (turn.messages.some(m => m.attachments?.length || m.silent) || turn.heldBack || turn.silent || turn.quietLoop) throw new Error('OUTSIDE_TEXT_SUBSET');
    const fixtureContact = binding.get(turn.conversationId);
    if (!fixtureContact) throw new Error('BINDING');
    if (processed.has(turn.turnId)) return 'duplicate';
    processed.add(turn.turnId); // No blind retry after ambiguous outcome; recovery deliberately unresolved.
    const request = (route, body) => post(`${turn.keiki.turnUrl}/${route}`, {authorization: `Bearer ${token}`}, body);
    try {
      for (const [i, m] of turn.messages.entries()) {
        const response = await onMessage({userPhoneNumber: fixtureContact, text: m.text, messageGuid: m.messageId, imageBase64: undefined});
        if (response) for (const [j, text] of splitIntoMessages(response).entries()) {
          const result = await request('messages', {text, idempotencyKey: `${turn.turnId}:${i}:${j}`});
          if (!result.ok) throw new Error('DELIVERY_NOT_CONFIRMED');
        }
      }
      await request('complete', {status: 'completed'});
    } catch (e) {
      await request('complete', {status: 'failed', error: e.message});
      throw e;
    }
  };
}
