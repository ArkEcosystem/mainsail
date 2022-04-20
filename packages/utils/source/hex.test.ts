import { describe } from "../../core-test-framework";
import { hex } from "./hex";

describe("hex", async ({ assert, it, nock, loader }) => {
	it("should encode the given string", () => {
		assert.is(hex.encode("Hello World"), "48656c6c6f20576f726c64");
	});

	it("should decode the given string", () => {
		assert.is(hex.decode("48656c6c6f20576f726c64"), "Hello World");
	});
});
