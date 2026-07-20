import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { DeployerContracts } from "./contracts.js";

const makeFakeRepo = () => ({
	clear: () => {},
	delete: () => {},
	metadata: {
		primaryColumns: [{ propertyName: "name" }],
		tableNameWithoutPrefix: "contracts",
	},
	upsert: () => {},
});

describe<{
	app: Application;
	listener: DeployerContracts;
	events: { listen: any; forget: any };
	repo: ReturnType<typeof makeFakeRepo>;
}>("DeployerContracts", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.events = { forget: () => {}, listen: () => {} };
		context.repo = makeFakeRepo();

		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => 1000 })
			.whenTagged("plugin", "api-sync");
		context.app.bind(ApiDatabaseIdentifiers.DataSource).toConstantValue({});
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		context.app.bind(Identifiers.ApiSync.Logger).toConstantValue({ debug: () => {}, error: () => {} });
		context.app.bind(ApiDatabaseIdentifiers.ContractRepositoryFactory).toConstantValue(() => context.repo);

		context.listener = context.app.resolve(DeployerContracts);
	});

	const contractEvent = {
		activeImplementation: "0ximpl",
		address: "0xproxy",
		implementations: [{ abi: {}, address: "0ximpl" }],
		name: "ConsensusV1",
		proxy: "UUPS",
	} as any;

	it("register: listens on the contract created event", async ({ listener, events }) => {
		const listen = spy(events, "listen");

		await listener.register();

		listen.calledWith(Events.DeployerEvent.ContractCreated, listener);
		listen.calledTimes(1);
	});

	it("created event: flush upserts the entity keyed by name", async ({ listener, repo }) => {
		const upsert = spy(repo, "upsert");

		await listener.handle({ data: contractEvent, name: Events.DeployerEvent.ContractCreated });
		await listener.flush({} as any);

		upsert.calledOnce();
		assert.equal(upsert.getCallArgs(0), [
			[
				{
					activeImplementation: "0ximpl",
					address: "0xproxy",
					implementations: contractEvent.implementations,
					name: "ConsensusV1",
					proxy: "UUPS",
				},
			],
			["name"],
		]);
	});

	it("created event: falls back to the contract address when no active implementation is set", async ({
		listener,
		repo,
	}) => {
		const upsert = spy(repo, "upsert");

		await listener.handle({
			data: { ...contractEvent, activeImplementation: undefined },
			name: Events.DeployerEvent.ContractCreated,
		});
		await listener.flush({} as any);

		upsert.calledOnce();
		assert.equal((upsert.getCallArgs(0)[0] as any[])[0].activeImplementation, "0xproxy");
	});
});
