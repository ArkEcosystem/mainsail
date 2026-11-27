import type { CloseReason, Direction } from "../enums.js";

// One check run before a socket is accepted (inbound) or dialed (outbound). Returning a reason rejects
// the socket; `undefined` passes it on to the next verifier.
export interface ConnectionVerifier {
	verify(ip: string, direction: Direction): CloseReason | undefined;
}
