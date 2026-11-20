// Dials addresses that are not peers yet, a few at a time. Callers do not wait: an address that answers
// arrives as a connection through the transport hook, one that does not leaves no trace. Skipped are
// invalid addresses, addresses that already are peers, are waiting or are being dialed, and every
// address once the queue is full.
export interface DialQueue {
	add(ip: string): void;
	dispose(): void;
}
