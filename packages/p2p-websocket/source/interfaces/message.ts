import type { CloseReason } from "../enums.js";

// Frames on the wire; see message.ts for the byte layout.
// `protocolVersion` is that of the wire protocol, `version` that of the node's software.
export type HelloMessage = { type: "hello"; protocolVersion: number; version: string };
export type RejectMessage = { type: "reject"; reason: CloseReason };
export type RequestMessage = { type: "request"; id: number; path: string; payload: Buffer };
export type ResponseMessage = { type: "response"; id: number; statusCode: number; payload: Buffer };

export type Message = HelloMessage | RejectMessage | RequestMessage | ResponseMessage;
