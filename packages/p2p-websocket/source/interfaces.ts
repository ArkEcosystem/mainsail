import type { CloseReason } from "./enums.js";

// One check run before a socket is accepted. Returning a reason rejects the socket;
// `undefined` passes it on to the next verifier.
export interface ConnectionVerifier {
	verify(ip: string): CloseReason | undefined;
}
