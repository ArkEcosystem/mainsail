import { describe } from "@mainsail/test-runner";

import { constants } from "./constants.js";
import { CloseReason } from "./enums.js";
import { ConnectionError } from "./errors.js";
import { decode, encode } from "./message.js";

describe("message", ({ it, assert, each }) => {
	const hello = { protocolVersion: constants.PROTOCOL_VERSION, type: "hello" as const, version: "0.0.1-rc.9" };

	const protocolError = (run: () => unknown): string => {
		try {
			run();
		} catch (error) {
			assert.instance(error, ConnectionError);
			assert.equal((error as ConnectionError).reason, CloseReason.ProtocolError);

			return (error as ConnectionError).message;
		}

		throw new Error("Expected a protocol error");
	};

	it("hello - should carry the protocol version and the version of the software", () => {
		const frame = encode(hello);

		assert.equal(frame.byteLength, 1 + 2 + 1 + hello.version.length);
		assert.equal(decode(frame), hello);
	});

	it("hello - should carry a version of the longest length and an empty one", () => {
		const longest = { ...hello, version: "1".repeat(constants.MAX_VERSION_LENGTH) };

		assert.equal(decode(encode(longest)), longest);
		assert.equal(decode(encode({ ...hello, version: "" })), { ...hello, version: "" });
	});

	it("hello - should not encode a version that is too long", () => {
		const version = "1".repeat(constants.MAX_VERSION_LENGTH + 1);

		assert.equal(
			protocolError(() => encode({ ...hello, version })),
			"Hello version too long",
		);
	});

	it("hello - should not decode a frame without the version length", () => {
		assert.equal(
			protocolError(() => decode(encode(hello).subarray(0, 3))),
			"Invalid hello length",
		);
	});

	each(
		"hello - should not decode a frame whose",
		({ dataset: [, frame] }) => {
			assert.equal(
				protocolError(() => decode(frame)),
				"Invalid hello version length",
			);
		},
		[
			["version is cut short", encode(hello).subarray(0, -1)],
			["version is followed by more bytes", Buffer.concat([encode(hello), Buffer.from([0])])],
			[
				"version is longer than allowed",
				Buffer.concat([
					Buffer.from([0, 0, constants.PROTOCOL_VERSION, constants.MAX_VERSION_LENGTH + 1]),
					Buffer.alloc(constants.MAX_VERSION_LENGTH + 1, "1"),
				]),
			],
		] as [string, Buffer][],
	);

	it("reject - should carry the reason", () => {
		const reject = { reason: CloseReason.Full, type: "reject" as const };

		assert.equal(decode(encode(reject)), reject);
	});

	it("request - should carry the id, the path and the payload", () => {
		const request = { id: 7, path: "getStatus", payload: Buffer.from("payload"), type: "request" as const };

		assert.equal(decode(encode(request)), request);
	});

	it("response - should carry the id, the status code and the payload", () => {
		const response = { id: 7, payload: Buffer.from("payload"), statusCode: 200, type: "response" as const };

		assert.equal(decode(encode(response)), response);
	});
});
