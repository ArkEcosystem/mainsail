import "jest-extended";

import { factory } from "@packages/core-test-framework/source/factories/helpers";

describe("Helpers", () => {
	it("should register all factories", async () => {
		expect(factory("Block")).toBeDefined();
		expect(factory("Identity")).toBeDefined();
		expect(factory("Peer")).toBeDefined();
		expect(factory("Round")).toBeDefined();
		expect(factory("Transfer")).toBeDefined();
		expect(factory("DelegateRegistration")).toBeDefined();
		expect(factory("DelegateResignation")).toBeDefined();
		expect(factory("Vote")).toBeDefined();
		expect(factory("Unvote")).toBeDefined();
		expect(factory("MultiSignature")).toBeDefined();
		expect(factory("MultiPayment")).toBeDefined();
		expect(factory("Wallet")).toBeDefined();
	});
});
