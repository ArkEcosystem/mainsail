import { constants } from "./constants.js";
import { CloseReason } from "./enums.js";
import { ConnectionError } from "./errors.js";

// Frame layout: <type uint8><body>
// hello body:    <version uint16>                                  sent by the dialer, echoed by the acceptor once it accepts
// reject body:   <reason uint8>                                    sent by the acceptor instead of its hello, then it closes
// request body:  <id uint32><pathLength uint8><path><payload>      either side, once the handshake is done
// response body: <id uint32><statusCode uint16><payload>           answers the request with the same id

type HelloMessage = { type: "hello"; version: number };
type RejectMessage = { type: "reject"; reason: CloseReason };
type RequestMessage = { type: "request"; id: number; path: string; payload: Buffer };
type ResponseMessage = { type: "response"; id: number; statusCode: number; payload: Buffer };

type Message = HelloMessage | RejectMessage | RequestMessage | ResponseMessage;

const typeToByte: Record<Message["type"], number> = {
	hello: 0,
	reject: 1,
	request: 2,
	response: 3,
};

const byteToType = new Map<number, Message["type"]>(
	Object.entries(typeToByte).map(([type, byte]) => [byte, type as Message["type"]]),
);

// Only reasons an acceptor can tell a dialer; the wire value is stable, the enum order is not.
const reasonToByte: Partial<Record<CloseReason, number>> = {
	[CloseReason.Banned]: 2,
	[CloseReason.DuplicatePeer]: 3,
	[CloseReason.Rejected]: 1,
	[CloseReason.Shutdown]: 4,
	[CloseReason.VersionMismatch]: 0,
};

const REJECTED_BYTE = 1;

const byteToReason = new Map<number, CloseReason>(
	Object.entries(reasonToByte).map(([reason, byte]) => [byte, reason as CloseReason]),
);

const REQUEST_HEADER_LENGTH = 1 + 4 + 1;
const RESPONSE_HEADER_LENGTH = 1 + 4 + 2;

const protocolError = (message: string): ConnectionError => new ConnectionError(CloseReason.ProtocolError, message);

const encode = (message: Message): Buffer => {
	switch (message.type) {
		case "hello": {
			const buffer = Buffer.alloc(3);
			buffer.writeUInt8(typeToByte.hello, 0);
			buffer.writeUInt16BE(message.version, 1);
			return buffer;
		}
		case "reject": {
			const buffer = Buffer.alloc(2);
			buffer.writeUInt8(typeToByte.reject, 0);
			buffer.writeUInt8(reasonToByte[message.reason] ?? REJECTED_BYTE, 1);
			return buffer;
		}
		case "request": {
			const path = Buffer.from(message.path);
			if (path.byteLength > constants.MAX_PATH_LENGTH) {
				throw protocolError("Request path too long");
			}

			const header = Buffer.alloc(REQUEST_HEADER_LENGTH);
			header.writeUInt8(typeToByte.request, 0);
			header.writeUInt32BE(message.id, 1);
			header.writeUInt8(path.byteLength, 5);
			return Buffer.concat([header, path, message.payload]);
		}
		case "response": {
			const header = Buffer.alloc(RESPONSE_HEADER_LENGTH);
			header.writeUInt8(typeToByte.response, 0);
			header.writeUInt32BE(message.id, 1);
			header.writeUInt16BE(message.statusCode, 5);
			return Buffer.concat([header, message.payload]);
		}
	}
};

const decode = (buffer: Buffer): Message => {
	if (buffer.byteLength < 1) {
		throw protocolError("Empty frame");
	}

	const type = byteToType.get(buffer.readUInt8(0));
	if (!type) {
		throw protocolError("Unknown message type");
	}

	switch (type) {
		case "hello": {
			if (buffer.byteLength !== 3) {
				throw protocolError("Invalid hello length");
			}

			return { type, version: buffer.readUInt16BE(1) };
		}
		case "reject": {
			if (buffer.byteLength !== 2) {
				throw protocolError("Invalid reject length");
			}

			const reason = byteToReason.get(buffer.readUInt8(1));
			if (!reason) {
				throw protocolError("Unknown reject reason");
			}

			return { reason, type };
		}
		case "request": {
			if (buffer.byteLength < REQUEST_HEADER_LENGTH) {
				throw protocolError("Invalid request length");
			}

			const pathLength = buffer.readUInt8(5);
			if (pathLength > constants.MAX_PATH_LENGTH || buffer.byteLength < REQUEST_HEADER_LENGTH + pathLength) {
				throw protocolError("Invalid request path length");
			}

			const pathEnd = REQUEST_HEADER_LENGTH + pathLength;
			return {
				id: buffer.readUInt32BE(1),
				path: buffer.subarray(REQUEST_HEADER_LENGTH, pathEnd).toString(),
				payload: buffer.subarray(pathEnd),
				type,
			};
		}
		case "response": {
			if (buffer.byteLength < RESPONSE_HEADER_LENGTH) {
				throw protocolError("Invalid response length");
			}

			return {
				id: buffer.readUInt32BE(1),
				payload: buffer.subarray(RESPONSE_HEADER_LENGTH),
				statusCode: buffer.readUInt16BE(5),
				type,
			};
		}
	}
};

export {
	decode,
	encode,
	type HelloMessage,
	type Message,
	type RejectMessage,
	type RequestMessage,
	type ResponseMessage,
};
