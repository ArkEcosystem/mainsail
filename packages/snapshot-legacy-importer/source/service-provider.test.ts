import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Importer } from "./importer";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();

		for (const identifier of [
			Identifiers.Services.Filesystem.Service,
			Identifiers.Services.Log.Service,
			Identifiers.Cryptography.Configuration,
			Identifiers.Evm.Instance,
			Identifiers.EvmConsensus.DeployerAddress,
			Identifiers.EvmConsensus.Contracts.Consensus,
			Identifiers.EvmConsensus.Contracts.Usernames,
			Identifiers.Cryptography.Hash.Factory,
			Identifiers.Cryptography.Identity.Address.Factory,
			Identifiers.Cryptography.Legacy.Identity.AddressFactory,
			Identifiers.Cryptography.Identity.PublicKey.Factory,
		]) {
			context.app.bind(identifier).toConstantValue({});
		}

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("#register - should bind the importer as a singleton", async ({ app, serviceProvider }) => {
		assert.false(app.isBound(Identifiers.Snapshot.Legacy.Importer));

		await serviceProvider.register();

		const importer = app.get(Identifiers.Snapshot.Legacy.Importer);
		assert.instance(importer, Importer);
		assert.is(app.get(Identifiers.Snapshot.Legacy.Importer), importer);
	});
});
