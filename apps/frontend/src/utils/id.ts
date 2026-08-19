/** Client-generated idempotency key for a new message — stable per send, retried safely if the request is repeated. */
export function randomMessageId(): string {
  return `msg-${crypto.randomUUID()}`;
}
