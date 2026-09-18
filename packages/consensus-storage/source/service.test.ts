import type { Contracts } from "@mainsail/contracts";
import type { RootDatabase } from "lmdb";

import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { open } from "lmdb";
import { join } from "path";
import { dirSync, setGracefulCleanup } from "tmp";

import { Service } from "./service";

const { Prevote, Precommit } = Enums.Crypto.MessageType;

describe<{
	app: Application;
	rootStorage: RootDatabase;
	service: Service;
}>("Service", ({ beforeEach, it, assert, stub }) => {
	const state1: Contracts.Consensus.StateData = {
		blockNumber: 1,
		lockedRound: undefined,
		round: 0,
		step: Enums.Consensus.Step.Propose,
		validRound: undefined,
	};

	const state1Round2: Contracts.Consensus.StateData = {
		blockNumber: 1,
		lockedRound: 1,
		round: 2,
		step: Enums.Consensus.Step.Prevote,
		validRound: 1,
	};

	const state2: Contracts.Consensus.StateData = {
		blockNumber: 2,
		lockedRound: undefined,
		round: 0,
		step: Enums.Consensus.Step.Precommit,
		validRound: undefined,
	};

	const makeProposal = (
		blockNumber: number,
		round: number,
		validatorIndex: number,
		serialized: string,
	): Contracts.Crypto.Proposal =>
		({
			blockHeader: { number: blockNumber },
			round,
			serialized: Buffer.from(serialized),
			validatorIndex,
		}) as unknown as Contracts.Crypto.Proposal;

	const makeMessage = (
		blockNumber: number,
		round: number,
		validatorIndex: number,
		type: Contracts.Crypto.MessageType,
		serialized: string,
	): Contracts.Crypto.Message =>
		({
			blockNumber,
			round,
			serialized: Buffer.from(serialized),
			type,
			validatorIndex,
		}) as unknown as Contracts.Crypto.Message;

	beforeEach((context) => {
		setGracefulCleanup();
		const storage = open({
			compression: true,
			name: "consensus",
			path: join(dirSync().name, "consensus.mdb"),
		});

		context.app = new Application();
		context.rootStorage = storage;
		context.app.bind(Identifiers.ConsensusStorage.Root).toConstantValue(storage);
		context.app
			.bind(Identifiers.ConsensusStorage.Storage.Proposal)
			.toConstantValue(storage.openDB({ encoding: "binary", name: "proposals" }));
		context.app
			.bind(Identifiers.ConsensusStorage.Storage.Message)
			.toConstantValue(storage.openDB({ encoding: "binary", name: "message" }));
		context.app
			.bind(Identifiers.ConsensusStorage.Storage.ConsensusState)
			.toConstantValue(storage.openDB({ name: "consensus" }));

		// The factories hand the stored bytes back, so the tests compare bytes.
		context.app.bind(Identifiers.Cryptography.Proposal.Factory).toConstantValue({
			makeProposalFromBytes: async (bytes: Buffer) => bytes,
		});
		context.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue({
			makeMessageFromBytes: async (bytes: Buffer) => bytes,
		});

		context.service = context.app.resolve(Service);
	});

	it("#getState - should return undefined when nothing is stored", async ({ service }) => {
		assert.undefined(await service.getState());
	});

	it("#getProposals - should return an empty array when nothing is stored", async ({ service }) => {
		assert.equal(await service.getProposals(), []);
	});

	it("#getMessages - should return an empty array when nothing is stored", async ({ service }) => {
		assert.equal(await service.getMessages(), []);
	});

	it("#saveState - should store the state data", async ({ service }) => {
		await service.saveState(state1Round2);

		assert.equal(await service.getState(), state1Round2);
	});

	it("#saveState - should store only the state data of a consensus state", async ({ service }) => {
		// The live consensus state also carries the locked and valid round states, which do not belong on disk.
		await service.saveState({ ...state1Round2, lockedValue: { round: 1 }, validValue: { round: 1 } } as never);

		assert.equal(await service.getState(), state1Round2);
	});

	it("#saveState - should replace the state of the same block", async ({ service }) => {
		await service.saveState(state1);
		await service.saveState(state1Round2);

		assert.equal(await service.getState(), state1Round2);
	});

	it("#saveProposal - should store the proposal bytes under its round and validator index", async ({ service }) => {
		await service.saveProposal(makeProposal(1, 0, 3, "proposal-0-3"));
		await service.saveProposal(makeProposal(1, 1, 4, "proposal-1-4"));
		// Same round and validator index: the later bytes replace the earlier ones.
		await service.saveProposal(makeProposal(1, 1, 4, "proposal-1-4-again"));

		assert.equal(await service.getProposals(), [Buffer.from("proposal-0-3"), Buffer.from("proposal-1-4-again")]);
	});

	it("#saveMessage - should store the message bytes under its round, validator index and type", async ({
		service,
	}) => {
		await service.saveMessage(makeMessage(1, 0, 3, Prevote, "prevote-0-3"));
		await service.saveMessage(makeMessage(1, 0, 3, Precommit, "precommit-0-3"));
		await service.saveMessage(makeMessage(1, 1, 4, Prevote, "prevote-1-4"));

		assert.equal(await service.getMessages(), [
			Buffer.from("prevote-0-3"),
			Buffer.from("precommit-0-3"),
			Buffer.from("prevote-1-4"),
		]);
	});

	it("should keep every record of the stored block", async ({ service }) => {
		await service.saveState(state1);
		await service.saveProposal(makeProposal(1, 0, 3, "proposal"));
		await service.saveMessage(makeMessage(1, 0, 3, Prevote, "prevote"));
		await service.saveState(state1Round2);
		await service.saveMessage(makeMessage(1, 2, 4, Precommit, "precommit"));

		assert.equal(await service.getState(), state1Round2);
		assert.equal(await service.getProposals(), [Buffer.from("proposal")]);
		assert.equal(await service.getMessages(), [Buffer.from("prevote"), Buffer.from("precommit")]);
	});

	it("should drop the records of the stored block with the first record of a higher block", async ({ service }) => {
		await service.saveState(state1Round2);
		await service.saveProposal(makeProposal(1, 0, 3, "proposal"));
		await service.saveMessage(makeMessage(1, 0, 3, Prevote, "prevote"));

		await service.saveMessage(makeMessage(2, 0, 5, Prevote, "prevote-of-block-2"));

		assert.undefined(await service.getState());
		assert.equal(await service.getProposals(), []);
		assert.equal(await service.getMessages(), [Buffer.from("prevote-of-block-2")]);

		await service.saveState(state2);

		assert.equal(await service.getState(), state2);
		assert.equal(await service.getMessages(), [Buffer.from("prevote-of-block-2")]);
	});

	it("should drop the stored records once when the first records of a higher block arrive together", async ({
		service,
	}) => {
		await service.saveMessage(makeMessage(1, 0, 3, Prevote, "prevote-of-block-1"));

		await Promise.all([
			service.saveMessage(makeMessage(2, 0, 3, Prevote, "prevote-of-block-2")),
			service.saveProposal(makeProposal(2, 0, 4, "proposal-of-block-2")),
			service.saveState(state2),
		]);

		assert.equal(await service.getState(), state2);
		assert.equal(await service.getProposals(), [Buffer.from("proposal-of-block-2")]);
		assert.equal(await service.getMessages(), [Buffer.from("prevote-of-block-2")]);
	});

	it("should take the stored block from the stored state when created", async ({ app, service }) => {
		// A restart creates a new service over the same store; it must know which block the records belong to.
		await service.saveState(state2);
		await service.saveMessage(makeMessage(2, 0, 3, Prevote, "prevote-of-block-2"));

		const restarted = app.resolve(Service);

		await restarted.saveMessage(makeMessage(2, 0, 4, Prevote, "another-prevote-of-block-2"));
		assert.equal(await restarted.getMessages(), [
			Buffer.from("prevote-of-block-2"),
			Buffer.from("another-prevote-of-block-2"),
		]);

		await restarted.saveMessage(makeMessage(3, 0, 3, Prevote, "prevote-of-block-3"));
		assert.undefined(await restarted.getState());
		assert.equal(await restarted.getMessages(), [Buffer.from("prevote-of-block-3")]);
	});

	it("#clear - should drop every record", async ({ service }) => {
		await service.saveState(state2);
		await service.saveProposal(makeProposal(2, 0, 3, "proposal"));
		await service.saveMessage(makeMessage(2, 0, 3, Prevote, "prevote"));

		await service.clear();

		assert.undefined(await service.getState());
		assert.equal(await service.getProposals(), []);
		assert.equal(await service.getMessages(), []);
	});

	it("#clear - should accept records of a lower block afterwards", async ({ service }) => {
		// After a database reset the node continues at an earlier block than the one the store held.
		await service.saveState(state2);

		await service.clear();
		await service.saveState(state1);
		await service.saveMessage(makeMessage(1, 0, 3, Prevote, "prevote"));

		assert.equal(await service.getState(), state1);
		assert.equal(await service.getMessages(), [Buffer.from("prevote")]);
	});

	it("should fail the application when a write cannot be committed", async ({ app, rootStorage, service }) => {
		const error = new Error("disk is full");
		stub(rootStorage, "transaction").rejectedValue(error);
		// Never resolves, like a termination waiting on a lock the caller holds; the write must not wait for it.
		const terminate = stub(app, "terminate").callsFake(() => new Promise(() => {}));

		await assert.rejects(() => service.saveMessage(makeMessage(1, 0, 3, Prevote, "prevote")), "disk is full");

		terminate.calledOnce();
		terminate.calledWith("Failed to write the consensus store", error);
	});
});
