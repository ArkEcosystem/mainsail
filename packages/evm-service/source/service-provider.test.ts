import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";

const TAGS = ["evm", "validator", "transaction-pool", "rpc"];

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("register binds an evm instance for every instance tag", async ({ app, serviceProvider }) => {
		for (const tag of TAGS) {
			assert.false(app.isBoundTagged(Identifiers.Evm.Instance, "instance", tag));
		}

		await serviceProvider.register();

		for (const tag of TAGS) {
			assert.true(app.isBoundTagged(Identifiers.Evm.Instance, "instance", tag));
		}
	});

	it("boot resolves without doing anything", async ({ serviceProvider }) => {
		await assert.resolves(() => serviceProvider.boot());
	});

	it("dispose disposes every bound tagged instance", async ({ app, serviceProvider }) => {
		// Binds the real (native) EvmInstance per tag once a fake is bound instead.
		const bindFakeInstances = (app: Application) => {
			const instances: Record<string, { dispose: () => Promise<void> }> = {};
			for (const tag of TAGS) {
				instances[tag] = { dispose: async () => {} };
				app.bind(Identifiers.Evm.Instance).toConstantValue(instances[tag]).whenTagged("instance", tag);
			}
			return instances;
		};

		const instances = bindFakeInstances(app);
		const disposals = TAGS.map((tag) => spy(instances[tag], "dispose"));

		await serviceProvider.dispose();

		for (const disposal of disposals) {
			disposal.calledOnce();
		}
	});

	it("dispose skips tags that are not bound", async ({ app, serviceProvider }) => {
		const instance = { dispose: async () => {} };
		app.bind(Identifiers.Evm.Instance).toConstantValue(instance).whenTagged("instance", "evm");
		const disposal = spy(instance, "dispose");

		// validator / transaction-pool / rpc are unbound; dispose must not throw on them.
		await assert.resolves(() => serviceProvider.dispose());

		disposal.calledOnce();
	});
});
