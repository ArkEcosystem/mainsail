import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { makeQueryIterable, makeTransaction } from "../../test/fixtures/transactions";
import { TransactionsController } from "./transactions";

describe<{
	app: Application;
	controller: TransactionsController;
	processor: { process: (data: Buffer[]) => Promise<object> };
	transactions: ReturnType<typeof makeTransaction>[];
}>("TransactionsController", ({ it, assert, beforeEach, stub }) => {
	beforeEach((context) => {
		context.transactions = [makeTransaction(1), makeTransaction(2)];
		context.processor = { process: async () => ({}) };

		context.app = new Application();
		context.app.bind(Identifiers.TransactionPool.Processor).toConstantValue(context.processor);
		context.app.bind(Identifiers.TransactionPool.Query).toConstantValue({
			getFromHighestPriority: () => makeQueryIterable(context.transactions),
		});

		context.controller = context.app.resolve(TransactionsController);
	});

	it("#store - decodes hex payload into buffers and returns the processor result", async ({
		controller,
		processor,
	}) => {
		const process = stub(processor, "process").resolvedValue({
			accept: ["0"],
			broadcast: ["0"],
			errors: { "1": { message: "nope", type: "ERR_INVALID" } },
			excess: [],
			invalid: ["1"],
		});

		const result = await controller.store({ payload: { transactions: ["deadbeef", "c0ffee"] } } as any);

		assert.equal(result, {
			data: { accept: ["0"], broadcast: ["0"], excess: [], invalid: ["1"] },
			errors: { "1": { message: "nope", type: "ERR_INVALID" } },
		});

		process.calledOnce();
		const buffers = process.getCallArgs(0)[0] as Buffer[];
		assert.equal(
			buffers.map((buffer) => buffer.toString("hex")),
			["deadbeef", "c0ffee"],
		);
	});

	it("#unconfirmed - returns all transactions without filters", async ({ controller, transactions }) => {
		const result: any = await controller.unconfirmed({ query: { limit: 100, page: 1 } } as any);

		assert.is(result.totalCount, 2);
		assert.length(result.results, 2);
		assert.equal(result.results[0].hash, transactions[0].hash);
		assert.equal(result.results[0].value, "100000");
	});

	it("#unconfirmed - slices the result set by page and limit", async ({ controller, transactions }) => {
		const result: any = await controller.unconfirmed({ query: { limit: 1, page: 2 } } as any);

		assert.is(result.totalCount, 2);
		assert.length(result.results, 1);
		assert.equal(result.results[0].hash, transactions[1].hash);
	});

	it("#unconfirmed - filters by a list of from addresses", async ({ controller, transactions }) => {
		const [first, second] = transactions;

		let result: any = await controller.unconfirmed({
			query: { from: [first.from, second.from], limit: 100, page: 1 },
		} as any);
		assert.length(result.results, 2);

		result = await controller.unconfirmed({
			query: { from: [`0x${"9".repeat(40)}`], limit: 100, page: 1 },
		} as any);
		assert.length(result.results, 0);
	});

	it("#unconfirmed - filters by a list of to addresses", async ({ controller, transactions }) => {
		// A contract creation has no recipient and must never match a to filter.
		transactions.push({ ...makeTransaction(3), to: undefined } as any);

		const result: any = await controller.unconfirmed({
			query: { limit: 100, page: 1, to: [transactions[1].to] },
		} as any);

		assert.length(result.results, 1);
		assert.equal(result.results[0].hash, transactions[1].hash);
	});

	it("#unconfirmed - matches an address list against both sides", async ({ controller, transactions }) => {
		const [first, second] = transactions;

		const result: any = await controller.unconfirmed({
			query: { address: [first.from, second.to], limit: 100, page: 1 },
		} as any);

		assert.length(result.results, 2);
	});

	it("#unconfirmed - matches addresses case-insensitively", async ({ controller, transactions }) => {
		const checksummed = "0xAbCdEf1234567890aBcDeF1234567890AbCdEf12";
		transactions.push({ ...makeTransaction(3), from: checksummed } as any);

		let result: any = await controller.unconfirmed({
			query: { from: checksummed.toLowerCase(), limit: 100, page: 1 },
		} as any);
		assert.length(result.results, 1);

		result = await controller.unconfirmed({
			query: { from: [checksummed.toUpperCase().replace("0X", "0x")], limit: 100, page: 1 },
		} as any);
		assert.length(result.results, 1);
	});

	it("#unconfirmed - returns nothing when the address matches neither side", async ({ controller }) => {
		const result: any = await controller.unconfirmed({
			query: { address: `0x${"9".repeat(40)}`, limit: 100, page: 1 },
		} as any);

		assert.length(result.results, 0);
	});

	it("#showUnconfirmed - returns the transformed transaction", async ({ controller, transactions }) => {
		const result: any = await controller.showUnconfirmed({ params: { hash: transactions[0].hash } } as any);

		assert.equal(result.data.hash, transactions[0].hash);
		assert.equal(result.data.value, "100000");
		assert.equal(result.data.nonce, "1");
		assert.false("serialized" in result.data);
	});

	it("#showUnconfirmed - returns a 404 for an unknown hash", async ({ controller }) => {
		const result: any = await controller.showUnconfirmed({ params: { hash: "f".repeat(64) } } as any);

		assert.true(result.isBoom);
		assert.is(result.output.statusCode, 404);
	});
});
