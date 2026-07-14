import { describe } from "@mainsail/test-runner";

import { bufferTransformer } from "./buffer";

describe("bufferTransformer", ({ it, assert }) => {
	it("from should convert a Buffer to a 0x-prefixed hex string", () => {
		assert.is(bufferTransformer.from(Buffer.from("abcd", "hex")), "0xabcd");
	});

	it("from should return null for null", () => {
		assert.null(bufferTransformer.from(null));
	});

	it("from should return null for undefined", () => {
		assert.null(bufferTransformer.from(undefined));
	});

	it("to should decode a 0x-prefixed hex string into a Buffer", () => {
		const result = bufferTransformer.to("0xabcd");
		assert.instance(result, Buffer);
		assert.is(result.toString("hex"), "abcd");
	});

	it("to should decode a hex string without 0x prefix into a Buffer", () => {
		const result = bufferTransformer.to("abcd");
		assert.instance(result, Buffer);
		assert.is(result.toString("hex"), "abcd");
	});

	it("to should return an empty buffer for an empty string", () => {
		const result = bufferTransformer.to("");
		assert.instance(result, Buffer);
		assert.length(result, 0);
	});

	it("to should return an empty buffer for a bare 0x", () => {
		const result = bufferTransformer.to("0x");
		assert.instance(result, Buffer);
		assert.length(result, 0);
	});

	it("to should pass a Buffer through unchanged", () => {
		const input = Buffer.from("deadbeef", "hex");
		assert.is(bufferTransformer.to(input), input);
	});
});
