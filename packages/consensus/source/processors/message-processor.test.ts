import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { MessageProcessor } from "./message-processor";

const { Prevote, Precommit } = Enums.Crypto.MessageType;
const { Accepted, Invalid, Skipped } = Enums.Consensus.ProcessorResult;

describe<{
	app: Application;
	processor: MessageProcessor;
	broadcaster: any;
	commitLock: any;
	consensus: any;
	logger: any;
	roundState: any;
	roundStateRepository: any;
	serializer: any;
	stateStore: any;
	timestampCalculator: any;
	validatorSet: any;
	worker: any;
}>("MessageProcessor", ({ it, assert, beforeEach, stub, spy }) => {
	const blockNumber = 1;
	const round = 1;
	const genesisBlockHash = "genesis-hash";
	const previousBlockHash = "previous-hash";
	const blsPublicKey = "aa".repeat(48);
	const serializedForSignature = Buffer.from("serialized-for-signature");

	const makeMessage = (overrides: Record<string, unknown> = {}): Contracts.Crypto.Message => {
		const data = {
			blockHash: "block-hash",
			blockNumber,
			round,
			signature: "bb".repeat(96),
			type: Prevote,
			validatorIndex: 1,
			...overrides,
		};

		return {
			...data,
			serialized: Buffer.from(JSON.stringify(data)),
			toData: () => data,
		} as unknown as Contracts.Crypto.Message;
	};

	beforeEach((context) => {
		context.consensus = { getBlockNumber: () => blockNumber, getRound: () => round, handle: async () => {} };
		context.commitLock = { runNonExclusive: async (callback: () => Promise<unknown>) => callback() };
		context.stateStore = {
			getGenesisCommit: () => ({ block: { hash: genesisBlockHash } }),
			getLastBlock: () => ({ hash: previousBlockHash }),
		};
		// Rounds are in bounds by default; individual tests move the minimal timestamp into the future.
		context.timestampCalculator = { calculateMinimalTimestamp: () => Date.now() - 10_000 };
		context.logger = { error: () => {}, warn: () => {} };
		context.serializer = { serializeMessageForSignature: async () => serializedForSignature };
		context.validatorSet = { getValidator: () => ({ blsPublicKey }) };
		context.roundState = {
			addMessage: () => {},
			blockNumber,
			getMessage: () => undefined,
			hasMessage: () => false,
			round,
		};
		context.roundStateRepository = { getRoundState: () => context.roundState };
		context.broadcaster = { broadcastMessage: async () => {} };
		context.worker = { consensusSignature: async () => true };

		context.app = new Application();
		context.app.bind(Identifiers.Consensus.Service).toConstantValue(context.consensus);
		context.app.bind(Identifiers.Consensus.CommitLock).toConstantValue(context.commitLock);
		context.app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);
		context.app.bind(Identifiers.BlockchainUtils.TimestampCalculator).toConstantValue(context.timestampCalculator);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Cryptography.Message.Serializer).toConstantValue(context.serializer);
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);
		context.app.bind(Identifiers.Consensus.RoundStateRepository).toConstantValue(context.roundStateRepository);
		context.app.bind(Identifiers.P2P.Broadcaster).toConstantValue(context.broadcaster);
		context.app.bind(Identifiers.CryptoWorker.WorkerPool).toConstantValue({ getWorker: () => context.worker });

		context.processor = context.app.resolve(MessageProcessor);
	});

	it("#process - should run under the non-exclusive commit lock", async ({ processor, commitLock }) => {
		const runNonExclusive = spy(commitLock, "runNonExclusive");

		await processor.process(makeMessage());

		runNonExclusive.calledOnce();
	});

	it("#process - should skip a message for another block number", async ({
		processor,
		roundStateRepository,
		worker,
	}) => {
		const getRoundState = spy(roundStateRepository, "getRoundState");
		const consensusSignature = spy(worker, "consensusSignature");

		assert.equal(await processor.process(makeMessage({ blockNumber: blockNumber + 1 })), Skipped);
		assert.equal(await processor.process(makeMessage({ blockNumber: blockNumber - 1 })), Skipped);

		getRoundState.neverCalled();
		consensusSignature.neverCalled();
	});

	it("#process - should skip a message for a past round", async ({ processor, roundStateRepository }) => {
		const getRoundState = spy(roundStateRepository, "getRoundState");

		assert.equal(await processor.process(makeMessage({ round: round - 1 })), Skipped);

		getRoundState.neverCalled();
	});

	it("#process - should accept a message for a future round of the current block", async ({
		processor,
		roundStateRepository,
	}) => {
		const getRoundState = spy(roundStateRepository, "getRoundState");

		assert.equal(await processor.process(makeMessage({ round: round + 5 })), Accepted);

		getRoundState.calledWith(blockNumber, round + 5);
	});

	it("#process - should reject a message whose round is not in bounds yet", async ({
		processor,
		roundStateRepository,
		stateStore,
		timestampCalculator,
		worker,
	}) => {
		const calculateMinimalTimestamp = stub(timestampCalculator, "calculateMinimalTimestamp").returnValue(
			Date.now() + 60_000,
		);
		const getRoundState = spy(roundStateRepository, "getRoundState");
		const consensusSignature = spy(worker, "consensusSignature");

		assert.equal(await processor.process(makeMessage()), Invalid);

		calculateMinimalTimestamp.calledWith(stateStore.getLastBlock(), round);
		getRoundState.neverCalled();
		consensusSignature.neverCalled();
	});

	it("#process - should tolerate up to 500ms of time drift for the round bounds", async ({
		processor,
		timestampCalculator,
	}) => {
		stub(timestampCalculator, "calculateMinimalTimestamp").returnValue(Date.now() + 200);

		assert.equal(await processor.process(makeMessage()), Accepted);
	});

	it("#process - should skip a message the round state already holds", async ({
		processor,
		roundState,
		logger,
		worker,
	}) => {
		const message = makeMessage();
		roundState.hasMessage = () => true;
		roundState.getMessage = () => message;
		const warn = spy(logger, "warn");
		const addMessage = spy(roundState, "addMessage");
		const consensusSignature = spy(worker, "consensusSignature");

		assert.equal(await processor.process(message), Skipped);

		warn.neverCalled();
		addMessage.neverCalled();
		consensusSignature.neverCalled();
	});

	it("#process - should warn about a conflicting message of the same validator and skip it", async ({
		processor,
		roundState,
		logger,
	}) => {
		const existing = makeMessage({ blockHash: "block-hash" });
		const conflicting = makeMessage({ blockHash: "other-hash" });
		roundState.hasMessage = () => true;
		roundState.getMessage = () => existing;
		const warn = spy(logger, "warn");
		const addMessage = spy(roundState, "addMessage");

		assert.equal(await processor.process(conflicting), Skipped);

		warn.calledOnce();
		const [text, channel] = warn.getCallArgs(0);
		assert.startsWith(text, `Conflicting prevote for validator index 1 in block ${blockNumber}/${round}.`);
		assert.match(text, `Existing: ${existing.serialized.toString("hex")}`);
		assert.match(text, `New: ${conflicting.serialized.toString("hex")}`);
		assert.equal(channel, "consensus");
		addMessage.neverCalled();
	});

	it("#process - should name precommits in the conflict warning", async ({ processor, roundState, logger }) => {
		roundState.hasMessage = () => true;
		roundState.getMessage = () => makeMessage({ blockHash: "block-hash", type: Precommit });
		const warn = spy(logger, "warn");

		await processor.process(makeMessage({ blockHash: "other-hash", type: Precommit }));

		assert.startsWith(warn.getCallArgs(0)[0], "Conflicting precommit for validator index 1");
	});

	it("#process - should verify the signature with the crypto worker", async ({
		processor,
		serializer,
		validatorSet,
		worker,
	}) => {
		const message = makeMessage({ validatorIndex: 3 });
		const serializeMessageForSignature = spy(serializer, "serializeMessageForSignature");
		const getValidator = spy(validatorSet, "getValidator");
		const consensusSignature = spy(worker, "consensusSignature");

		await processor.process(message);

		serializeMessageForSignature.calledOnce();
		serializeMessageForSignature.calledWith(message.toData(), { genesisBlockHash, previousBlockHash });
		getValidator.calledWith(3);
		consensusSignature.calledOnce();
		consensusSignature.calledWith(
			"verify",
			Buffer.from(message.signature, "hex"),
			serializedForSignature,
			Buffer.from(blsPublicKey, "hex"),
		);
	});

	it("#process - should reject a message with an invalid signature", async ({
		processor,
		roundState,
		broadcaster,
		consensus,
		worker,
	}) => {
		stub(worker, "consensusSignature").resolvedValue(false);
		const addMessage = spy(roundState, "addMessage");
		const broadcastMessage = spy(broadcaster, "broadcastMessage");
		const handle = spy(consensus, "handle");

		assert.equal(await processor.process(makeMessage()), Invalid);

		addMessage.neverCalled();
		broadcastMessage.neverCalled();
		handle.neverCalled();
	});

	it("#process - should add, broadcast and handle an accepted message", async ({
		processor,
		roundState,
		broadcaster,
		consensus,
	}) => {
		const message = makeMessage();
		const addMessage = spy(roundState, "addMessage");
		const broadcastMessage = spy(broadcaster, "broadcastMessage");
		const handle = spy(consensus, "handle");

		assert.equal(await processor.process(message), Accepted);

		addMessage.calledOnce();
		addMessage.calledWith(message);
		broadcastMessage.calledOnce();
		broadcastMessage.calledWith(message);
		handle.calledOnce();
		handle.calledWith(roundState);
	});

	it("#process - should not broadcast when broadcasting is disabled", async ({
		processor,
		roundState,
		broadcaster,
		consensus,
	}) => {
		const addMessage = spy(roundState, "addMessage");
		const broadcastMessage = spy(broadcaster, "broadcastMessage");
		const handle = spy(consensus, "handle");

		assert.equal(await processor.process(makeMessage(), false), Accepted);

		addMessage.calledOnce();
		broadcastMessage.neverCalled();
		handle.calledOnce();
	});

	it("#process - should skip a conflicting message that arrived while the signature was verified", async ({
		processor,
		roundState,
		logger,
		worker,
	}) => {
		const first = makeMessage({ blockHash: "block-hash" });
		const second = makeMessage({ blockHash: "other-hash" });

		// Mirrors RoundState: one message per validator and type, adding a second one throws.
		const held: Contracts.Crypto.Message[] = [];
		roundState.hasMessage = (message: Contracts.Crypto.Message) =>
			held.some((m) => m.validatorIndex === message.validatorIndex && m.type === message.type);
		roundState.getMessage = () => held[0];
		roundState.addMessage = (message: Contracts.Crypto.Message) => {
			if (roundState.hasMessage(message)) {
				throw new Error("Prevote already exists.");
			}
			held.push(message);
		};
		const releases: ((value: boolean) => void)[] = [];
		stub(worker, "consensusSignature").callsFake(() => new Promise((resolve) => releases.push(resolve)));
		const warn = spy(logger, "warn");

		// Both messages pass the duplicate check before either signature comes back.
		const results = Promise.all([processor.process(first), processor.process(second)]);
		await new Promise((resolve) => setImmediate(resolve));
		releases[0](true);
		await new Promise((resolve) => setImmediate(resolve));
		releases[1](true);

		assert.equal(await results, [Accepted, Skipped]);
		assert.equal(held, [first]);
		warn.calledOnce();
	});

	it("#process - should verify identical in-flight copies only once", async ({
		processor,
		roundState,
		broadcaster,
		worker,
	}) => {
		const message = makeMessage();
		const copy = makeMessage();
		let release!: (value: boolean) => void;
		const consensusSignature = stub(worker, "consensusSignature").callsFake(
			() => new Promise((resolve) => (release = resolve)),
		);
		const addMessage = spy(roundState, "addMessage");
		const broadcastMessage = spy(broadcaster, "broadcastMessage");

		const results = Promise.all([processor.process(message), processor.process(copy), processor.process(copy)]);
		await new Promise((resolve) => setImmediate(resolve));
		release(true);

		assert.equal(await results, [Accepted, Skipped, Skipped]);
		consensusSignature.calledOnce();
		addMessage.calledOnce();
		addMessage.calledWith(message);
		broadcastMessage.calledOnce();
	});

	it("#process - should reject every identical in-flight copy when the signature is invalid", async ({
		processor,
		roundState,
		worker,
	}) => {
		let release!: (value: boolean) => void;
		const consensusSignature = stub(worker, "consensusSignature").callsFake(
			() => new Promise((resolve) => (release = resolve)),
		);
		const addMessage = spy(roundState, "addMessage");

		const results = Promise.all([processor.process(makeMessage()), processor.process(makeMessage())]);
		await new Promise((resolve) => setImmediate(resolve));
		release(false);

		assert.equal(await results, [Invalid, Invalid]);
		consensusSignature.calledOnce();
		addMessage.neverCalled();
	});

	it("#process - should verify distinct messages independently", async ({ processor, worker }) => {
		const consensusSignature = spy(worker, "consensusSignature");

		const results = await Promise.all([
			processor.process(makeMessage({ validatorIndex: 0 })),
			processor.process(makeMessage({ validatorIndex: 1 })),
		]);

		assert.equal(results, [Accepted, Accepted]);
		consensusSignature.calledTimes(2);
	});

	it("#process - should fail every identical in-flight copy when the signature check throws and allow a retry", async ({
		processor,
		roundState,
		worker,
	}) => {
		const message = makeMessage();
		let fail!: (error: Error) => void;
		const consensusSignature = stub(worker, "consensusSignature").callsFake(
			() => new Promise((_, reject) => (fail = reject)),
		);
		const addMessage = spy(roundState, "addMessage");

		const results = Promise.allSettled([processor.process(message), processor.process(makeMessage())]);
		await new Promise((resolve) => setImmediate(resolve));
		fail(new Error("worker down"));

		for (const result of await results) {
			assert.equal(result.status, "rejected");
			assert.equal((result as PromiseRejectedResult).reason.message, "worker down");
		}
		addMessage.neverCalled();

		// The pending entry is gone, so the same message can be verified again once the worker is back.
		consensusSignature.resolvedValue(true);

		assert.equal(await processor.process(message), Accepted);
		consensusSignature.calledTimes(2);
		addMessage.calledOnce();
	});
});
