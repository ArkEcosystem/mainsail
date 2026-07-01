import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ReceiptResource } from "./index.js";

describe<{
	app: Application;
	resource: ReceiptResource;
}>("ReceiptResource", ({ beforeEach, it, assert }) => {
	const transaction = {
		blockHash: "aa".repeat(32),
		blockNumber: 255,
		from: "0x0000000000000000000000000000000000000001",
		hash: "bb".repeat(32),
		to: "0x0000000000000000000000000000000000000002",
		transactionIndex: 3,
	} as any;

	const header = {
		logsBloom: "cc".repeat(256),
	} as any;

	beforeEach((context) => {
		context.app = new Application();
		context.resource = context.app.resolve(ReceiptResource);
	});

	it("should transform a receipt with status truthy to 0x1", async ({ resource }) => {
		const receipt = {
			contractAddress: "0x0000000000000000000000000000000000000003",
			cumulativeGasUsed: BigInt(21_000),
			gasUsed: BigInt(1000),
			logs: [{ address: "0x0000000000000000000000000000000000000004" }],
			status: 1,
		} as any;

		const result: any = await resource.transform(transaction, header, receipt);

		assert.equal(result, {
			blockHash: `0x${"aa".repeat(32)}`,
			blockNumber: "0xff",
			contractAddress: "0x0000000000000000000000000000000000000003",
			cumulativeGasUsed: "0x5208",
			effectiveGasUsed: "0x3e8",
			from: "0x0000000000000000000000000000000000000001",
			gasUsed: "0x3e8",
			logs: [{ address: "0x0000000000000000000000000000000000000004" }],
			logsBloom: `0x${"cc".repeat(256)}`,
			status: "0x1",
			to: "0x0000000000000000000000000000000000000002",
			transactionHash: `0x${"bb".repeat(32)}`,
			transactionIndex: "0x3",
			type: "0x0",
		});
	});

	it("should transform status falsy to 0x0", async ({ resource }) => {
		const receipt = {
			contractAddress: undefined,
			cumulativeGasUsed: BigInt(0),
			gasUsed: BigInt(0),
			logs: [],
			status: 0,
		} as any;

		const result: any = await resource.transform(transaction, header, receipt);

		assert.is(result.status, "0x0");
		assert.is(result.cumulativeGasUsed, "0x0");
		assert.is(result.gasUsed, "0x0");
		assert.is(result.effectiveGasUsed, "0x0");
		assert.undefined(result.contractAddress);
		assert.equal(result.logs, []);
	});

	it("should hex-encode gasUsed and cumulativeGasUsed independently", async ({ resource }) => {
		const receipt = {
			contractAddress: undefined,
			cumulativeGasUsed: BigInt(255),
			gasUsed: BigInt(16),
			logs: [],
			status: 1,
		} as any;

		const result: any = await resource.transform(transaction, header, receipt);

		assert.is(result.cumulativeGasUsed, "0xff");
		assert.is(result.gasUsed, "0x10");
		// effectiveGasUsed mirrors gasUsed for non-EIP1559
		assert.is(result.effectiveGasUsed, "0x10");
	});
});
