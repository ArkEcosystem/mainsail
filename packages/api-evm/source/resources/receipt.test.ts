import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ReceiptResource } from "./index.js";

describe<{
	app: Application;
	resource: ReceiptResource;
}>("ReceiptResource", ({ beforeEach, it, assert }) => {
	const transaction = {
		blockHash: "a".repeat(64),
		blockNumber: 255,
		from: "0x0000000000000000000000000000000000000001",
		gasPrice: 1_000_000_000,
		hash: "b".repeat(64),
		to: "0x0000000000000000000000000000000000000002",
		transactionIndex: 3,
	} as any;

	const header = {
		logsBloom: "c".repeat(512),
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
			blockHash: `0x${"a".repeat(64)}`,
			blockNumber: "0xff",
			contractAddress: "0x0000000000000000000000000000000000000003",
			cumulativeGasUsed: "0x5208",
			effectiveGasPrice: "0x3b9aca00",
			from: "0x0000000000000000000000000000000000000001",
			gasUsed: "0x3e8",
			logs: [{ address: "0x0000000000000000000000000000000000000004" }],
			logsBloom: `0x${"c".repeat(512)}`,
			status: "0x1",
			to: "0x0000000000000000000000000000000000000002",
			transactionHash: `0x${"b".repeat(64)}`,
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
		assert.is(result.effectiveGasPrice, "0x3b9aca00");
		assert.null(result.contractAddress);
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
	});

	it("should return to = null and keep contractAddress for a contract creation", async ({ resource }) => {
		const receipt = {
			contractAddress: "0x0000000000000000000000000000000000000005",
			cumulativeGasUsed: BigInt(21_000),
			gasUsed: BigInt(21_000),
			logs: [],
			status: 1,
		} as any;

		const result: any = await resource.transform({ ...transaction, to: undefined }, header, receipt);

		assert.is(result.contractAddress, "0x0000000000000000000000000000000000000005");
		assert.null(result.to);
	});

	it("should return contractAddress = null and keep to for a non-creation transaction", async ({ resource }) => {
		const receipt = {
			contractAddress: undefined,
			cumulativeGasUsed: BigInt(21_000),
			gasUsed: BigInt(21_000),
			logs: [],
			status: 1,
		} as any;

		const result: any = await resource.transform(transaction, header, receipt);

		assert.null(result.contractAddress);
		assert.is(result.to, "0x0000000000000000000000000000000000000002");
	});

	// Documents current behavior: logs are passed through as delivered by the EVM,
	// including null when the receipt has none; the eth JSON-RPC spec expects [].
	it("should pass through null logs unchanged", async ({ resource }) => {
		const receipt = {
			contractAddress: undefined,
			cumulativeGasUsed: BigInt(0),
			gasUsed: BigInt(0),
			logs: null,
			status: 1,
		} as any;

		const result: any = await resource.transform(transaction, header, receipt);

		assert.null(result.logs);
	});
});
