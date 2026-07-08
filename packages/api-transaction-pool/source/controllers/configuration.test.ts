import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ConfigurationController } from "./configuration";

describe<{
	app: Application;
	controller: ConfigurationController;
	pluginConfiguration: { getRequired: (key: string) => number };
	stateStore: { getBlockNumber: () => number };
}>("ConfigurationController", ({ it, assert, beforeEach, stub }) => {
	beforeEach((context) => {
		context.pluginConfiguration = {
			getRequired: (key: string) =>
				({
					maxTransactionAge: 2700,
					maxTransactionBytes: 2_000_000,
					maxTransactionsInPool: 15_000,
					maxTransactionsPerRequest: 40,
					maxTransactionsPerSender: 150,
				})[key],
		};
		context.stateStore = { getBlockNumber: () => 42 };

		context.app = new Application();
		context.app.bind(Identifiers.Application.Version).toConstantValue("0.0.1");
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.pluginConfiguration)
			.whenTagged("plugin", "transaction-pool-service");
		context.app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);

		context.controller = context.app.resolve(ConfigurationController);
	});

	it("#configuration - returns the block number, core version and pool limits", async ({ controller }) => {
		const result = await controller.configuration();

		assert.equal(result, {
			data: {
				blockNumber: 42,
				core: {
					version: "0.0.1",
				},
				transactionPool: {
					maxTransactionAge: 2700,
					maxTransactionBytes: 2_000_000,
					maxTransactionsInPool: 15_000,
					maxTransactionsPerRequest: 40,
					maxTransactionsPerSender: 150,
				},
			},
		});
	});

	it("#configuration - reflects the current state store block number", async ({ controller, stateStore }) => {
		stub(stateStore, "getBlockNumber").returnValue(1337);

		const result: any = await controller.configuration();

		assert.equal(result.data.blockNumber, 1337);
	});

	it("#configuration - reads every pool limit from the plugin configuration", async ({
		controller,
		pluginConfiguration,
	}) => {
		const getRequired = stub(pluginConfiguration, "getRequired").callsFake(
			(key: string) =>
				({
					maxTransactionAge: 1,
					maxTransactionBytes: 2,
					maxTransactionsInPool: 3,
					maxTransactionsPerRequest: 4,
					maxTransactionsPerSender: 5,
				})[key],
		);

		const result: any = await controller.configuration();

		assert.equal(result.data.transactionPool, {
			maxTransactionAge: 1,
			maxTransactionBytes: 2,
			maxTransactionsInPool: 3,
			maxTransactionsPerRequest: 4,
			maxTransactionsPerSender: 5,
		});
		getRequired.calledTimes(5);
	});
});
