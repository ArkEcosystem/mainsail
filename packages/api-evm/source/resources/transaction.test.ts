import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { TransactionResource } from "./index.js";

describe<{
	app: Application;
	resource: TransactionResource;
}>("TransactionResource", ({ beforeEach, it, assert }) => {
	const makeTransaction = (overrides: object = {}): any => ({
		blockHash: "aa".repeat(32),
		blockNumber: 255n,
		data: "0xabcdef",
		from: "0x1111111111111111111111111111111111111111",
		gasLimit: 21_000n,
		gasPrice: 5_000_000_000n,
		hash: "bb".repeat(32),
		network: 30n,
		nonce: 16n,
		r: "1a2b",
		s: "3c4d",
		to: "0x2222222222222222222222222222222222222222",
		transactionIndex: 2,
		v: "1b",
		value: 1_000_000_000_000_000_000n,
		...overrides,
	});

	beforeEach((context) => {
		context.app = new Application();
		context.resource = context.app.resolve(TransactionResource);
	});

	it("should transform into the 0x-prefixed JSON-RPC shape", async ({ resource }) => {
		const result: any = await resource.transform(makeTransaction());

		assert.equal(result.blockHash, `0x${"aa".repeat(32)}`);
		assert.equal(result.blockNumber, "0xff");
		assert.equal(result.chainId, "0x1e");
		assert.equal(result.from, "0x1111111111111111111111111111111111111111");
		assert.equal(result.gas, "0x5208");
		assert.equal(result.gasPrice, "0x12a05f200");
		assert.equal(result.hash, `0x${"bb".repeat(32)}`);
		assert.equal(result.input, "0xabcdef");
		assert.equal(result.nonce, "0x10");
		assert.equal(result.to, "0x2222222222222222222222222222222222222222");
		assert.equal(result.transactionIndex, "0x2");
		assert.equal(result.value, "0xde0b6b3a7640000");
		assert.equal(result.type, "0x0");
		assert.equal(result.v, "0x1b");
		assert.equal(result.r, "0x1a2b");
		assert.equal(result.s, "0x3c4d");
	});

	it("should set to = null when to is undefined (contract creation)", async ({ resource }) => {
		const result: any = await resource.transform(makeTransaction({ to: undefined }));

		assert.null(result.to);
	});

	it("should set to = null when to is an empty string", async ({ resource }) => {
		const result: any = await resource.transform(makeTransaction({ to: "" }));

		assert.null(result.to);
	});

	it("should keep to when a recipient address is present", async ({ resource }) => {
		const result: any = await resource.transform(
			makeTransaction({ to: "0x3333333333333333333333333333333333333333" }),
		);

		assert.equal(result.to, "0x3333333333333333333333333333333333333333");
	});

	it("should always report type 0x0", async ({ resource }) => {
		const result: any = await resource.transform(makeTransaction());

		assert.equal(result.type, "0x0");
	});

	// Pins CURRENT (buggy) behavior: optional chaining on blockNumber/transactionIndex
	// yields the invalid string "0xundefined" instead of JSON-RPC null for pending txs.
	it("should produce 0xundefined when blockNumber/transactionIndex are undefined", async ({ resource }) => {
		const result: any = await resource.transform(
			makeTransaction({ blockNumber: undefined, transactionIndex: undefined }),
		);

		assert.equal(result.blockNumber, "0xundefined");
		assert.equal(result.transactionIndex, "0xundefined");
	});
});
