import { CloseReason } from "./enums.js";
import { ConnectionError } from "./errors.js";

// Frame layout: <type uint8><body>
// hello body: <version uint16>

type HelloMessage = { type: "hello"; version: number };

type Message = HelloMessage;

const typeToByte: Record<Message["type"], number> = {
	hello: 0,
};

const byteToType = new Map<number, Message["type"]>(
	Object.entries(typeToByte).map(([type, byte]) => [byte, type as Message["type"]]),
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
	}
};

export { decode, encode, type HelloMessage, type Message };
