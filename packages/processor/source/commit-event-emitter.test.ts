import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { CommitEventEmitter } from "./commit-event-emitter.js";

const blockNumber = 3;
const blockData = { hash: "block-hash" };
const receipt = { cumulativeGasUsed: 21_000n, gasRefunded: 0n, gasUsed: 21_000n, logs: [], status: 1 };

const makeTransaction = (index: number) => ({
	blockHash: "block-hash",
	blockNumber,
	hash: `hash-${index}`,
	toData: () => ({ hash: `hash-${index}` }),
	transactionIndex: index - 1,
});

const appliedData = (index: number) => ({
	blockHash: "block-hash",
	blockNumber,
	hash: `hash-${index}`,
	receipt,
	transactionIndex: index - 1,
});

const makeBlock = (transactions: ReturnType<typeof makeTransaction>[] = []) => ({
	number: blockNumber,
	toData: () => blockData,
	transactions,
});

const makeUnit = (block: ReturnType<typeof makeBlock>, overrides: Record<string, unknown> = {}) =>
	({
		getBlock: () => block,
		getContractEvents: () => [],
		getProcessorResult: () => ({
			receipts: new Map(block.transactions.map((transaction) => [transaction.hash, receipt])),
		}),
		...overrides,
	}) as unknown as Contracts.Processor.ProcessableUnit;

const settle = async () => new Promise((resolve) => setImmediate(resolve));

describe<{
	app: Application;
	emitter: CommitEventEmitter;
	events: any;
	logger: any;
	state: any;
}>("CommitEventEmitter", ({ it, beforeEach, assert, spy, stub }) => {
	beforeEach((context) => {
		context.events = { dispatch: async () => {} };
		context.logger = { error: () => {} };
		context.state = { isBootstrap: () => false };

		context.app = new Application();
		context.app.bind(Identifiers.State.State).toConstantValue(context.state);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.emitter = context.app.resolve(CommitEventEmitter);
	});

	it("#emit - should emit the applied event of each transaction and then of the block", ({ emitter, events }) => {
		const dispatch = spy(events, "dispatch");

		emitter.emit(makeUnit(makeBlock([makeTransaction(1), makeTransaction(2)])));

		dispatch.calledTimes(3);
		dispatch.calledNthWith(0, Events.TransactionEvent.Applied, appliedData(1));
		dispatch.calledNthWith(1, Events.TransactionEvent.Applied, appliedData(2));
		dispatch.calledNthWith(2, Events.BlockEvent.Applied, { ...blockData, contractEvents: [] });
	});

	it("#emit - should include the receipt of each transaction in its applied event", ({ emitter, events }) => {
		const receipt1 = { ...receipt, output: Buffer.from("08c379a0", "hex"), status: 0 };
		const receipt2 = { ...receipt, gasUsed: 30_000n };
		const receipts = new Map([
			["hash-1", receipt1],
			["hash-2", receipt2],
		]);
		const dispatch = spy(events, "dispatch");

		emitter.emit(
			makeUnit(makeBlock([makeTransaction(1), makeTransaction(2)]), {
				getProcessorResult: () => ({ receipts }),
			}),
		);

		dispatch.calledTimes(3);
		dispatch.calledNthWith(0, Events.TransactionEvent.Applied, {
			...appliedData(1),
			receipt: { ...receipt, output: "0x08c379a0", status: 0 },
		});
		dispatch.calledNthWith(1, Events.TransactionEvent.Applied, { ...appliedData(2), receipt: receipt2 });
	});

	it("#emit - should emit the validator and vote changes of the block once per kind", ({ emitter, events }) => {
		const contractEvents = [
			{ address: "validator-1", blsPublicKey: "bls-1", event: "ValidatorRegistered", txHash: "tx-1", txIndex: 0 },
			{ event: "Voted", txHash: "tx-2", txIndex: 1, validator: "validator-1", voter: "voter-1" },
			{ event: "Voted", txHash: "tx-3", txIndex: 2, validator: "validator-1", voter: "voter-2" },
			{ event: "Unvoted", txHash: "tx-4", txIndex: 3, validator: "validator-2", voter: "voter-3" },
			{ address: "validator-2", blsPublicKey: "bls-2", event: "ValidatorUpdated", txHash: "tx-5", txIndex: 4 },
			{ address: "validator-3", event: "ValidatorResigned", txHash: "tx-6", txIndex: 5 },
		];
		const dispatch = spy(events, "dispatch");

		emitter.emit(makeUnit(makeBlock(), { getContractEvents: () => contractEvents }));

		dispatch.calledTimes(6);
		dispatch.calledNthWith(0, Events.ValidatorEvent.Registered, {
			addresses: ["validator-1"],
			blockNumber,
			validators: [{ address: "validator-1", blsPublicKey: "bls-1", txHash: "tx-1", txIndex: 0 }],
		});
		dispatch.calledNthWith(1, Events.ValidatorEvent.Updated, {
			addresses: ["validator-2"],
			blockNumber,
			validators: [{ address: "validator-2", blsPublicKey: "bls-2", txHash: "tx-5", txIndex: 4 }],
		});
		dispatch.calledNthWith(2, Events.ValidatorEvent.Resigned, {
			addresses: ["validator-3"],
			blockNumber,
			validators: [{ address: "validator-3", txHash: "tx-6", txIndex: 5 }],
		});
		dispatch.calledNthWith(3, Events.VoteEvent.Voted, {
			addresses: ["voter-1", "validator-1", "voter-2"],
			blockNumber,
			votes: [
				{ txHash: "tx-2", txIndex: 1, validator: "validator-1", voter: "voter-1" },
				{ txHash: "tx-3", txIndex: 2, validator: "validator-1", voter: "voter-2" },
			],
		});
		dispatch.calledNthWith(4, Events.VoteEvent.Unvoted, {
			addresses: ["voter-3", "validator-2"],
			blockNumber,
			unvotes: [{ txHash: "tx-4", txIndex: 3, validator: "validator-2", voter: "voter-3" }],
		});
		dispatch.calledNthWith(5, Events.BlockEvent.Applied, { ...blockData, contractEvents });
	});

	it("#emit - should emit the username changes of the block once per kind", ({ emitter, events }) => {
		const contractEvents = [
			{ address: "wallet-1", event: "UsernameRegistered", txHash: "tx-1", txIndex: 0, username: "first" },
			{
				address: "wallet-2",
				event: "UsernameRegistered",
				previousUsername: "old",
				txHash: "tx-2",
				txIndex: 1,
				username: "second",
			},
			{ address: "wallet-3", event: "UsernameResigned", txHash: "tx-3", txIndex: 2, username: "third" },
		];
		const dispatch = spy(events, "dispatch");

		emitter.emit(makeUnit(makeBlock(), { getContractEvents: () => contractEvents }));

		dispatch.calledTimes(3);
		dispatch.calledNthWith(0, Events.UsernameEvent.Registered, {
			addresses: ["wallet-1", "wallet-2"],
			blockNumber,
			usernames: [
				{ address: "wallet-1", txHash: "tx-1", txIndex: 0, username: "first" },
				{ address: "wallet-2", previousUsername: "old", txHash: "tx-2", txIndex: 1, username: "second" },
			],
		});
		dispatch.calledNthWith(1, Events.UsernameEvent.Resigned, {
			addresses: ["wallet-3"],
			blockNumber,
			usernames: [{ address: "wallet-3", txHash: "tx-3", txIndex: 2, username: "third" }],
		});
		dispatch.calledNthWith(2, Events.BlockEvent.Applied, { ...blockData, contractEvents });
	});

	it("#emit - should report both a vote and an unvote of one wallet in the same block", ({ emitter, events }) => {
		const contractEvents = [
			{ event: "Voted", txHash: "tx-1", txIndex: 0, validator: "validator-1", voter: "voter-1" },
			{ event: "Unvoted", txHash: "tx-2", txIndex: 1, validator: "validator-1", voter: "voter-1" },
		];
		const dispatch = spy(events, "dispatch");

		emitter.emit(makeUnit(makeBlock(), { getContractEvents: () => contractEvents }));

		dispatch.calledTimes(3);
		dispatch.calledNthWith(0, Events.VoteEvent.Voted, {
			addresses: ["voter-1", "validator-1"],
			blockNumber,
			votes: [{ txHash: "tx-1", txIndex: 0, validator: "validator-1", voter: "voter-1" }],
		});
		dispatch.calledNthWith(1, Events.VoteEvent.Unvoted, {
			addresses: ["voter-1", "validator-1"],
			blockNumber,
			unvotes: [{ txHash: "tx-2", txIndex: 1, validator: "validator-1", voter: "voter-1" }],
		});
	});

	it("#emit - should announce the block after the events of its contents", ({ emitter, events }) => {
		const contractEvents = [
			{ event: "Voted", txHash: "hash-1", txIndex: 0, validator: "validator", voter: "voter" },
		];
		const dispatch = spy(events, "dispatch");

		emitter.emit(makeUnit(makeBlock([makeTransaction(1)]), { getContractEvents: () => contractEvents }));

		dispatch.calledTimes(3);
		assert.equal(
			[0, 1, 2].map((index) => dispatch.getCallArgs(index)[0]),
			[Events.TransactionEvent.Applied, Events.VoteEvent.Voted, Events.BlockEvent.Applied],
		);
	});

	it("#emit - should emit nothing while bootstrapping", ({ emitter, events, state }) => {
		state.isBootstrap = () => true;
		const dispatch = spy(events, "dispatch");

		emitter.emit(makeUnit(makeBlock([makeTransaction(1)])));

		dispatch.neverCalled();
	});

	it("#emit - should log a failing dispatch instead of throwing", async ({ emitter, events, logger }) => {
		const dispatchError = new Error("dispatch failed");
		dispatchError.stack = undefined;
		stub(events, "dispatch").rejectedValue(dispatchError);
		const logError = spy(logger, "error");

		emitter.emit(makeUnit(makeBlock()));
		await settle();

		logError.calledOnce();
		logError.calledWith("Dispatching block.applied failed: dispatch failed", "consensus");
	});
});
