import { describe } from "../../core-test-framework";
import { base64 } from "./base64";

describe("#base64", ({ it, assert }) => {
	it("should encode the given string", () => {
		assert.equal(base64.encode("Hello World"), "SGVsbG8gV29ybGQ=");
	});

	it("should decode the given string", () => {
		assert.equal(base64.decode("SGVsbG8gV29ybGQ="), "Hello World");
	});
});
