import { Identifiers, Enums } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "@mainsail/test-runner";
import { Service } from "./service";

import { open } from "lmdb";
import { join } from "path";
import { Contracts } from "@mainsail/contracts";

describe<{
	app: Application;
	service: Service;
}>("Service", ({ beforeEach, it, assert }) => {
	const state0: Contracts.Consensus.StateData = {
		blockNumber: 0,
		round: 0,
		step: Enums.Consensus.Step.Precommit,
		validRound: undefined,
		lockedRound: undefined,
	}

	const state1: Contracts.Consensus.StateData = {
		blockNumber: 1,
		round: 1,
		step: Enums.Consensus.Step.Prevote,
		validRound: 0,
		lockedRound: 0,
	}

	beforeEach((context) => {
		const app = new Application();

		setGracefulCleanup();
		const storage = open({
			compression: true,
			name: "consensus",
			path: join(dirSync().name, "consensus.mdb"),
		});

		app.bind(Identifiers.ConsensusStorage.Root).toConstantValue(storage);
		app
			.bind(Identifiers.ConsensusStorage.Storage.Proposal)
			.toConstantValue(storage.openDB({ name: "proposals" }));
		app
			.bind(Identifiers.ConsensusStorage.Storage.Message)
			.toConstantValue(storage.openDB({ name: "message" }));
		app
			.bind(Identifiers.ConsensusStorage.Storage.ConsensusState)
			.toConstantValue(storage.openDB({ name: "consensus" }));

		app.bind(Identifiers.Cryptography.Proposal.Factory).toConstantValue({
			makeProposalFromBytes: (a: any) => a,
		});
		app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue({
			makeMessageFromBytes: (a: any) => a,
		});

		context.service = app.resolve(Service);
		context.app = app;
	});

	it("#getState - should return undefined", async ({ service }) => {
		assert.undefined(await service.getState());
	});

	it("#getState - should return latest stored state", async ({ service }) => {
		assert.undefined(await service.getState());

		await service.persist({
			state: state0,
			proposals: [],
			messages: [],
		});
		assert.equal(await service.getState(), state0);
		assert.equal(await service.getProposals(), []);
		assert.equal(await service.getMessages(), []);

		await service.persist({
			state: state1,
			proposals: [],
			messages: [],
		});
		assert.equal(await service.getState(), state1);
		assert.equal(await service.getProposals(), []);
		assert.equal(await service.getMessages(), []);
	});

	it("#getProposals - should return empty array", async ({ service }) => {
		assert.equal(await service.getProposals(), []);
	});

	it("#getProposals - should return latest stored proposals", async ({ service }) => {
		assert.equal(await service.getProposals(), []);

		const proposalSerialized1 = Buffer.from("1_1")
		const proposalSerialized2 = Buffer.from("1_2")
		const proposalSerialized3 = Buffer.from("1_3")

		const proposal1 = {
			round: 1,
			validatorIndex: 1,
			serialized: proposalSerialized1
		} as Contracts.Crypto.Proposal;

		const proposal2 = {
			round: 2,
			validatorIndex: 2,
			serialized: proposalSerialized2
		} as Contracts.Crypto.Proposal;

		const proposal3 = {
			round: 3,
			validatorIndex: 3,
			serialized: proposalSerialized3
		} as Contracts.Crypto.Proposal;

		await service.persist({
			state: state0,
			proposals: [proposal1, proposal2],
			messages: [],
		});


		assert.equal(await service.getState(), state0);
		assert.equal(await service.getProposals(), [proposalSerialized1, proposalSerialized2]);
		assert.equal(await service.getMessages(), []);


		// Clear
		await service.persist({
			state: state1,
			proposals: [proposal3],
			messages: [],
		});

		assert.equal(await service.getState(), state1);
		assert.equal(await service.getProposals(), [proposalSerialized3]);
		assert.equal(await service.getMessages(), []);
	});

	it("#getMessages - should return empty array", async ({ service }) => {
		assert.equal(await service.getMessages(), []);
	});

	it("#getMessages - should return latest stored messages", async ({ service }) => {
		assert.equal(await service.getMessages(), []);

		const messageSerialized1 = Buffer.from("1_1")
		const messageSerialized2 = Buffer.from("1_2")
		const messageSerialized3 = Buffer.from("1_3")

		const message1 = {
			round: 1,
			validatorIndex: 1,
			serialized: messageSerialized1
		} as Contracts.Crypto.Message;

		const message2 = {
			round: 2,
			validatorIndex: 2,
			serialized: messageSerialized2
		} as Contracts.Crypto.Message;

		const message3 = {
			round: 3,
			validatorIndex: 3,
			serialized: messageSerialized3
		} as Contracts.Crypto.Message;

		await service.persist({
			state: state0,
			proposals: [],
			messages: [message1, message2],
		});

		assert.equal(await service.getState(), state0);
		assert.equal(await service.getProposals(), []);
		assert.equal(await service.getMessages(), [messageSerialized1, messageSerialized2]);

		await service.persist({
			state: state1,
			proposals: [],
			messages: [message3],
		});

		assert.equal(await service.getState(), state1);
		assert.equal(await service.getProposals(), []);
		assert.equal(await service.getMessages(), [messageSerialized3]);
	});
});
