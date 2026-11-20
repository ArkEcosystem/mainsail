import type { CloseReason, Direction } from "../enums.js";
import type { ConnectionError } from "../errors.js";
import type { Message } from "./message.js";

export type HandshakeOptions = {
	direction: Direction;
	// The version of our software, which the hello tells the peer.
	version: string;
	send: (message: Message) => void;
	reject: (reason: CloseReason) => void;
	// Called synchronously once the peer's hello has been accepted, before any later frame is processed.
	open: () => void;
	// Called for a hello or reject that arrives once the handshake is over; the connection is to be closed.
	fail: (error: ConnectionError) => void;
};
