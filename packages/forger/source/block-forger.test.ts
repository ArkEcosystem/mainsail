import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { BlockForger } from "./block-forger";
import { TransactionForger } from "./transaction-forger";

describe<{
	app: Application;
	blockFactory: any;
	blockForger: BlockForger;
	collationResult: any;
	cryptoConfiguration: any;
	hashFactory: any;
	stateStore: any;
	transactionForger: any;
}>("BlockForger", ({ beforeEach, it, assert, spy, stub }) => {
	const previousBlock = { hash: "parentHash", number: 2 };
	const transactionsRoot = Buffer.from("dd".repeat(32), "hex");

	const transaction1 = { hash: "11".repeat(32), serialized: Buffer.alloc(10), toData: () => "transactionData1" };
	const transaction2 = { hash: "22".repeat(32), serialized: Buffer.alloc(20), toData: () => "transactionData2" };

	beforeEach((context) => {
		context.collationResult = {
			fee: 255_000n,
			gasUsed: 51_000,
			logsBloom: "logsBloom",
			stateRoot: "stateRoot",
			transactions: [transaction1, transaction2],
		};
		context.transactionForger = {
			getTransactions: async () => context.collationResult,
			initialize(): any {
				return this;
			},
		};
		context.blockFactory = { make: async (data: any, transactions: any) => ({ data, transactions }) };
		context.hashFactory = { sha256: () => transactionsRoot };
		context.cryptoConfiguration = { getMilestone: () => ({ reward: "2000000000" }) };
		context.stateStore = { getLastBlock: () => previousBlock };

		const app = new Application();
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);
		app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);
		app.bind(Identifiers.Cryptography.Block.Factory).toConstantValue(context.blockFactory);
		app.bind(Identifiers.Cryptography.Hash.Factory).toConstantValue(context.hashFactory);
		app.bind(TransactionForger).toConstantValue(context.transactionForger);

		context.app = app;
		context.blockForger = app.resolve(BlockForger);
	});

	it("#forgeBlock - should collate transactions for the next block", async ({ blockForger, transactionForger }) => {
		const initialize = spy(transactionForger, "initialize");

		await blockForger.forgeBlock("generatorAddress", 1, 1_700_000_000, "randaoReveal");

		initialize.calledOnce();
		initialize.calledWith("generatorAddress", 1_700_000_000, { blockNumber: 3n, round: 1n });
	});

	it("#forgeBlock - should forge a block from the collated transactions", async ({
		blockFactory,
		blockForger,
		cryptoConfiguration,
		hashFactory,
	}) => {
		const make = spy(blockFactory, "make");
		const sha256 = spy(hashFactory, "sha256");
		const getMilestone = spy(cryptoConfiguration, "getMilestone");

		const block = await blockForger.forgeBlock("generatorAddress", 1, 1_700_000_000, "randaoReveal");

		getMilestone.calledWith(previousBlock.number + 1);
		sha256.calledWith([Buffer.from(transaction1.hash, "hex"), Buffer.from(transaction2.hash, "hex")]);
		make.calledOnce();
		make.calledWith(
			{
				fee: 255_000n,
				gasUsed: 51_000,
				logsBloom: "logsBloom",
				number: 3,
				parentHash: "parentHash",
				// 4 bytes of length overhead per transaction plus the serialized transactions themselves
				payloadSize: 2 * 4 + 10 + 20,
				proposer: "generatorAddress",
				randaoReveal: "randaoReveal",
				reward: 2_000_000_000n,
				round: 1,
				stateRoot: "stateRoot",
				timestamp: 1_700_000_000,
				transactionsCount: 2,
				transactionsRoot: transactionsRoot.toString("hex"),
				version: 1,
			},
			[transaction1, transaction2],
		);

		assert.equal(block, { data: make.getCallArgs(0)[0], transactions: [transaction1, transaction2] });
	});

	it("#forgeBlock - should forge an empty block when no transactions are collated", async ({
		blockFactory,
		blockForger,
		collationResult,
	}) => {
		collationResult.fee = 0n;
		collationResult.gasUsed = 0;
		collationResult.transactions = [];

		const make = spy(blockFactory, "make");

		await blockForger.forgeBlock("generatorAddress", 0, 1_700_000_000, "randaoReveal");

		const [data, transactions] = make.getCallArgs(0) as [any, any[]];
		assert.equal(data.payloadSize, 0);
		assert.equal(data.transactionsCount, 0);
		assert.empty(transactions);
	});

	it("#forgeBlock - should reject when a collated transaction has no hash", async ({
		blockFactory,
		blockForger,
		collationResult,
	}) => {
		collationResult.transactions = [{ serialized: Buffer.alloc(1), toData: () => ({}) }];

		const make = spy(blockFactory, "make");

		await assert.rejects(
			() => blockForger.forgeBlock("generatorAddress", 0, 1_700_000_000, "randaoReveal"),
			'Expected value which is "string".',
		);

		make.neverCalled();
	});

	it("#forgeBlock - should build the block header from the state snapshot the transactions were collated against", async ({
		blockFactory,
		blockForger,
		stateStore,
	}) => {
		// If a commit advances the store mid-collation, the header must still match the
		// snapshot the transactions were executed against, not the advanced block.
		const getLastBlock = stub(stateStore, "getLastBlock").returnValueSequence([
			previousBlock,
			{ hash: "advancedHash", number: 3 },
		]);
		const make = spy(blockFactory, "make");

		await blockForger.forgeBlock("generatorAddress", 1, 1_700_000_000, "randaoReveal");

		getLastBlock.calledOnce();
		const [data] = make.getCallArgs(0) as [any];
		assert.equal(data.number, previousBlock.number + 1);
		assert.equal(data.parentHash, previousBlock.hash);
	});
});
