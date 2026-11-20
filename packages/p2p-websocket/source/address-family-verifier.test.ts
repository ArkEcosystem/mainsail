import { describe } from "@mainsail/test-runner";

import { AddressFamilyVerifier } from "./address-family-verifier.js";
import { CloseReason } from "./enums.js";

describe<{
	verifier: AddressFamilyVerifier;
}>("AddressFamilyVerifier", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.verifier = new AddressFamilyVerifier();
	});

	it("should pass IPv4 addresses", ({ verifier }) => {
		assert.undefined(verifier.verify("178.165.55.55"));
		assert.undefined(verifier.verify("127.0.0.1"));
	});

	it("should reject IPv6 addresses", ({ verifier }) => {
		assert.equal(verifier.verify("2001:db8::1"), CloseReason.Rejected);
		assert.equal(verifier.verify("::1"), CloseReason.Rejected);
	});
});
