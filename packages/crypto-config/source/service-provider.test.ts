import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ServiceProvider } from "./service-provider";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

type Context = {
	app: Application;
	serviceProvider: ServiceProvider;
};

describe<Context>("ServiceProvider", ({ assert, it, beforeEach }) => {
	beforeEach(async (context) => {
		context.app = new Application();

		await context.app.resolve(ValidationServiceProvider).register();

		const configRepository = context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository);
		configRepository.set("crypto.genesisBlock", cryptoJson.genesisBlock);
		configRepository.set("crypto.milestones", cryptoJson.milestones);
		configRepository.set("crypto.network", cryptoJson.network);

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("should register configuration and set config from repository", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.Cryptography.Configuration));

		const configManager = app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
		assert.containKeys(configManager.all()!, ["genesisBlock", "milestones", "network"]);
		assert.equal(configManager.getNetwork(), cryptoJson.network);
		assert.equal(configManager.getGenesisCommit(), cryptoJson.genesisBlock);
		assert.equal(configManager.getMilestones().length, cryptoJson.milestones.length);
	});
});
