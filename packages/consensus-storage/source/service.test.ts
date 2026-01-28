import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "@mainsail/test-runner";
import { Service } from "./service";

import { open } from "lmdb";
import { join } from "path";

describe<{
	app: Application;
	service: Service;
}>("ServiceProvider", ({ beforeEach, afterEach, it, assert, spy }) => {
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

	it("#getProposals - should return empty array", async ({ service }) => {
		assert.equal(await service.getProposals(), []);
	});

	it("#getMessages - should return empty array", async ({ service }) => {
		assert.equal(await service.getMessages(), []);
	});

});
