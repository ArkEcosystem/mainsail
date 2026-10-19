import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { TransactionProcessor } from "./transaction-processor.js";

const block = { hash: "block-hash", number: 3, round: 1 } as Contracts.Crypto.Block;
const transaction = {
	data: "0xabcdef",
	from: "sender",
	gasLimit: 21_000,
	gasPrice: 5,
	hash: "tx-hash",
	nonce: 7n,
	senderLegacyAddress: "legacy-address",
	to: "recipient",
	value: 10n,
} as unknown as Contracts.Crypto.Transaction;

// Lets the fire-and-forget dispatch rejection reach its catch handler.
const settle = async () => new Promise((resolve) => setImmediate(resolve));

describe<{
	app: Application;
	configuration: any;
	events: any;
	evm: any;
	feeCalculator: any;
	logger: any;
	processor: TransactionProcessor;
	receipt: any;
	state: any;
}>("TransactionProcessor", ({ it, beforeEach, assert, spy, stub }) => {
	beforeEach((context) => {
		context.receipt = { gasUsed: 21_000n, status: 1 };
		context.evm = { process: async () => ({ receipt: context.receipt }) };
		context.configuration = {
			getMilestone: () => ({ evmSpec: "Latest", satoshi: { decimals: 18, denomination: 1e18 } }),
			getNetwork: () => ({ client: { symbol: "ARK" } }),
		};
		context.feeCalculator = {
			calculateConsumed: (gasPrice: number, gasUsed: bigint) => BigInt(gasPrice) * gasUsed,
		};
		context.logger = { debug: () => {}, error: () => {} };
		context.state = { isBootstrap: () => false };
		context.events = { dispatch: async () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm).whenTagged("instance", "evm");
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.BlockchainUtils.FeeCalculator).toConstantValue(context.feeCalculator);
		context.app.bind(Identifiers.State.State).toConstantValue(context.state);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);

		context.processor = context.app.resolve(TransactionProcessor);
	});

	it("should execute the transaction against the evm under the block's commit key and return its receipt", async ({
		configuration,
		evm,
		processor,
		receipt,
	}) => {
		const process = spy(evm, "process");
		const getMilestone = spy(configuration, "getMilestone");

		const result = await processor.process(block, transaction);

		assert.is(result, receipt);
		process.calledOnce();
		process.calledWith({
			commitKey: { blockHash: "block-hash", blockNumber: 3n, round: 1n },
			data: Buffer.from("abcdef", "hex"),
			from: "sender",
			gasLimit: 21_000n,
			gasPrice: 5n,
			legacyAddress: "legacy-address",
			nonce: 7n,
			specId: "Latest",
			to: "recipient",
			txHash: "tx-hash",
			value: 10n,
		});
		getMilestone.calledWith(3);
	});

	it("should emit the receipt of the transaction", async ({ events, processor, receipt }) => {
		const dispatch = spy(events, "dispatch");

		await processor.process(block, transaction);

		dispatch.calledOnce();
		dispatch.calledWith(Events.EvmEvent.TransactionReceipt, {
			receipt,
			sender: "sender",
			transactionId: "tx-hash",
		});
	});

	it("should not emit the receipt while bootstrapping", async ({ events, processor, receipt, state }) => {
		state.isBootstrap = () => true;
		const dispatch = spy(events, "dispatch");

		const result = await processor.process(block, transaction);

		assert.is(result, receipt);
		dispatch.neverCalled();
	});

	it("should log a failing receipt dispatch instead of throwing", async ({ events, logger, processor, receipt }) => {
		stub(events, "dispatch").rejectedValue(new Error("dispatch failed"));
		const logError = spy(logger, "error");

		const result = await processor.process(block, transaction);
		await settle();

		assert.is(result, receipt);
		logError.calledOnce();
		assert.startsWith(
			logError.getCallArgs(0)[0] as string,
			"Dispatching evm.transaction.receipt failed: Error: dispatch failed",
		);
		assert.equal(logError.getCallArgs(0)[1], "consensus");
	});

	it("should fall back to the message of a dispatch error without a stack", async ({ events, logger, processor }) => {
		const dispatchError = new Error("dispatch failed");
		dispatchError.stack = undefined;
		stub(events, "dispatch").rejectedValue(dispatchError);
		const logError = spy(logger, "error");

		await processor.process(block, transaction);
		await settle();

		logError.calledWith("Dispatching evm.transaction.receipt failed: dispatch failed", "consensus");
	});

	it("should log the executed call with the fee paid", async ({ feeCalculator, logger, processor }) => {
		const calculateConsumed = spy(feeCalculator, "calculateConsumed");
		const debug = spy(logger, "debug");

		await processor.process(block, transaction);

		calculateConsumed.calledWith(5, 21_000n);
		debug.calledWith(
			"executed EVM call (status=1, from=sender to=recipient gasUsed=21000 paidNativeFee=0.000000000000105 ARK deployed=)",
			"consensus",
		);
	});

	it("should log the address of a deployed contract", async ({ logger, processor, receipt }) => {
		receipt.contractAddress = "0xcontract";
		receipt.status = 0;
		const debug = spy(logger, "debug");

		await processor.process(block, transaction);

		debug.calledWith(
			"executed EVM call (status=0, from=sender to=recipient gasUsed=21000 paidNativeFee=0.000000000000105 ARK deployed=0xcontract)",
			"consensus",
		);
	});

	it("should propagate an evm failure without emitting a receipt", async ({ events, evm, logger, processor }) => {
		stub(evm, "process").rejectedValue(new Error("execution failed"));
		const dispatch = spy(events, "dispatch");
		const debug = spy(logger, "debug");

		await assert.rejects(() => processor.process(block, transaction), "execution failed");

		dispatch.neverCalled();
		debug.neverCalled();
	});
});
