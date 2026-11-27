import type { HelloMessage, Message } from "./interfaces/index.js";

import { constants } from "./constants.js";
import { CloseReason } from "./enums.js";
import { ConnectionError } from "./errors.js";

// Frame layout: <type uint8><body>
// hello body:    <protocolVersion uint16><versionLength uint8><version>
//                sent by the dialer, answered by the acceptor once it accepts
// reject body:   <reason uint8>
//                sent by the acceptor instead of its hello, then it closes
// request body:  <id uint32><pathLength uint8><path><payload>
//                either side, once the handshake is done
// response body: <id uint32><statusCode uint16><payload>
//                answers the request with the same id

// Wire value of each message type.
enum MessageType {
	Hello = 0,
	Reject = 1,
	Request = 2,
	Response = 3,
}

// Only reasons an acceptor can tell a dialer; the wire value is stable, the enum order is not.
const reasonToByte: Partial<Record<CloseReason, number>> = {
	[CloseReason.Banned]: 2,
	[CloseReason.DuplicatePeer]: 3,
	[CloseReason.Full]: 5,
	[CloseReason.Rejected]: 1,
	[CloseReason.Shutdown]: 4,
	[CloseReason.VersionMismatch]: 0,
};

const REJECTED_BYTE = 1;

const byteToReason = new Map<number, CloseReason>(
	Object.entries(reasonToByte).map(([reason, byte]) => [byte, reason as CloseReason]),
);

const HELLO_HEADER_LENGTH = 1 + 2 + 1;
const REQUEST_HEADER_LENGTH = 1 + 4 + 1;
const RESPONSE_HEADER_LENGTH = 1 + 4 + 2;

const protocolError = (message: string): ConnectionError => new ConnectionError(CloseReason.ProtocolError, message);

const encode = (message: Message): Buffer => {
	switch (message.type) {
		case "hello": {
			const version = Buffer.from(message.version);
			if (version.byteLength > constants.MAX_VERSION_LENGTH) {
				throw protocolError("Hello version too long");
			}

			const header = Buffer.alloc(HELLO_HEADER_LENGTH);
			header.writeUInt8(MessageType.Hello, 0);
			header.writeUInt16BE(message.protocolVersion, 1);
			header.writeUInt8(version.byteLength, 3);
			return Buffer.concat([header, version]);
		}
		case "reject": {
			const buffer = Buffer.alloc(2);
			buffer.writeUInt8(MessageType.Reject, 0);
			buffer.writeUInt8(reasonToByte[message.reason] ?? REJECTED_BYTE, 1);
			return buffer;
		}
		case "request": {
			const path = Buffer.from(message.path);
			if (path.byteLength > constants.MAX_PATH_LENGTH) {
				throw protocolError("Request path too long");
			}

			const header = Buffer.alloc(REQUEST_HEADER_LENGTH);
			header.writeUInt8(MessageType.Request, 0);
			header.writeUInt32BE(message.id, 1);
			header.writeUInt8(path.byteLength, 5);
			return Buffer.concat([header, path, message.payload]);
		}
		case "response": {
			const header = Buffer.alloc(RESPONSE_HEADER_LENGTH);
			header.writeUInt8(MessageType.Response, 0);
			header.writeUInt32BE(message.id, 1);
			header.writeUInt16BE(message.statusCode, 5);
			return Buffer.concat([header, message.payload]);
		}
	}
};

const decodeHello = (buffer: Buffer): HelloMessage => {
	if (buffer.byteLength < HELLO_HEADER_LENGTH) {
		throw protocolError("Invalid hello length");
	}

	const versionLength = buffer.readUInt8(3);
	if (versionLength > constants.MAX_VERSION_LENGTH || buffer.byteLength !== HELLO_HEADER_LENGTH + versionLength) {
		throw protocolError("Invalid hello version length");
	}

	return {
		protocolVersion: buffer.readUInt16BE(1),
		type: "hello",
		version: buffer.subarray(HELLO_HEADER_LENGTH).toString(),
	};
};

const decode = (buffer: Buffer): Message => {
	if (buffer.byteLength < 1) {
		throw protocolError("Empty frame");
	}

	switch (buffer.readUInt8(0)) {
		case MessageType.Hello: {
			return decodeHello(buffer);
		}
		case MessageType.Reject: {
			if (buffer.byteLength !== 2) {
				throw protocolError("Invalid reject length");
			}

			const reason = byteToReason.get(buffer.readUInt8(1));
			if (!reason) {
				throw protocolError("Unknown reject reason");
			}

			return { reason, type: "reject" };
		}
		case MessageType.Request: {
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
				type: "request",
			};
		}
		case MessageType.Response: {
			if (buffer.byteLength < RESPONSE_HEADER_LENGTH) {
				throw protocolError("Invalid response length");
			}

			return {
				id: buffer.readUInt32BE(1),
				payload: buffer.subarray(RESPONSE_HEADER_LENGTH),
				statusCode: buffer.readUInt16BE(5),
				type: "response",
			};
		}
		default: {
			throw protocolError("Unknown message type");
		}
	}
};

export { decode, encode };
