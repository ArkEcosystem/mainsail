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
}>("ServiceProvider", ({ beforeEach, afterEach, it, assert, spy }) => {
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

		app.bind(Identifiers.Cryptography.Proposal.Factory).toConstantValue({});
		app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue({});

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

		await service.persist({
			state: state1,
			proposals: [],
			messages: [],
		});
		assert.equal(await service.getState(), state1);
	});

	it("#getProposals - should return empty array", async ({ service }) => {
		assert.equal(await service.getProposals(), []);
	});

	it("#getMessages - should return empty array", async ({ service }) => {
		assert.equal(await service.getMessages(), []);
	});

	it("#persist - should persist", async ({ service }) => {
	});
});
