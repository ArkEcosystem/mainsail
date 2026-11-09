import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
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

describe<{
	app: Application;
	configuration: any;
	evm: any;
	feeCalculator: any;
	logger: any;
	processor: TransactionProcessor;
	receipt: any;
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

		context.app = new Application();
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm).whenTagged("instance", "evm");
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.BlockchainUtils.FeeCalculator).toConstantValue(context.feeCalculator);

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

	it("should propagate an evm failure", async ({ evm, logger, processor }) => {
		stub(evm, "process").rejectedValue(new Error("execution failed"));
		const debug = spy(logger, "debug");

		await assert.rejects(() => processor.process(block, transaction), "execution failed");

		debug.neverCalled();
	});
});
