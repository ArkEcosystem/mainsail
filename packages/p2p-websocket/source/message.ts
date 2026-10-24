import { CloseReason } from "./enums.js";
import { ConnectionError } from "./errors.js";

// Frame layout: <type uint8><body>
// hello body:  <version uint16>   sent by the dialer, echoed by the acceptor once it accepts
// reject body: <reason uint8>     sent by the acceptor instead of its hello, then it closes

type HelloMessage = { type: "hello"; version: number };
type RejectMessage = { type: "reject"; reason: CloseReason };

type Message = HelloMessage | RejectMessage;

const typeToByte: Record<Message["type"], number> = {
	hello: 0,
	reject: 1,
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
	}
};

export { decode, encode, type HelloMessage, type Message, type RejectMessage };
