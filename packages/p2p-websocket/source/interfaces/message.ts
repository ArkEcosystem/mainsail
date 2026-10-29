import type { CloseReason } from "../enums.js";

// Frames on the wire; see message.ts for the byte layout.
export type HelloMessage = { type: "hello"; version: number };
export type RejectMessage = { type: "reject"; reason: CloseReason };
export type RequestMessage = { type: "request"; id: number; path: string; payload: Buffer };
export type ResponseMessage = { type: "response"; id: number; statusCode: number; payload: Buffer };

export type Message = HelloMessage | RejectMessage | RequestMessage | ResponseMessage;
