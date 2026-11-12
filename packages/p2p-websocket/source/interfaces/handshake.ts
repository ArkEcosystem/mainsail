import type { CloseReason, Direction } from "../enums.js";
import type { Message } from "./message.js";

export type HandshakeOptions = {
	direction: Direction;
	send: (message: Message) => void;
	reject: (reason: CloseReason) => void;
	// Called synchronously once the peer's hello has been accepted, before any later frame is processed.
	open: () => void;
};
