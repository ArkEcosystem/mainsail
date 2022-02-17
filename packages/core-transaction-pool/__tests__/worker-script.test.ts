describe("worker-script.ts", () => {
	it("should not crash", () => {
		const check = () => require("../../../packages/core-transaction-pool/source/worker-script");
		expect(check).not.toThrow();
	});
});
