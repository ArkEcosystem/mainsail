import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ServiceProvider } from "./service-provider";

type Context = {
	app: Application;
	serviceProvider: ServiceProvider;
};

describe<Context>("ServiceProvider", ({ assert, it, beforeEach }) => {
	beforeEach((context) => {
		context.app = new Application();

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
		assert.equal(configManager.get("network"), cryptoJson.network);
		assert.equal(configManager.get("genesisBlock.block"), cryptoJson.genesisBlock.block);
		assert.equal(configManager.get<any[]>("milestones").length, cryptoJson.milestones.length);
	});
});
