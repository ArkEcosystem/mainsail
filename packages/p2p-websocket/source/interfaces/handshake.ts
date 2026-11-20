import type { CloseReason, Direction } from "../enums.js";
import type { Message } from "./message.js";

export type HandshakeOptions = {
	direction: Direction;
	send: (message: Message) => void;
	reject: (reason: CloseReason) => void;
};
