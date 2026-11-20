import type { CloseReason, Direction } from "../enums.js";
import type { ConnectionError } from "../errors.js";
import type { HelloMessage, Message } from "./message.js";

export type HandshakeOptions = {
	direction: Direction;
	// The version of our software, which the hello tells the peer.
	version: string;
	// Whether we connect with a peer whose hello names this version of its software.
	isValidVersion: (version: string) => boolean;
	send: (message: Message) => void;
	reject: (reason: CloseReason) => void;
	// Called synchronously with the peer's hello once it has been accepted, before any later frame is
	// processed.
	open: (hello: HelloMessage) => void;
	// Called for a hello or reject that arrives once the handshake is over; the connection is to be closed.
	fail: (error: ConnectionError) => void;
};
