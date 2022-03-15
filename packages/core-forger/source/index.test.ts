import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Application } from "@arkecosystem/core-kernel";

import { describe } from "../../core-test-framework";
import { ServiceProvider } from "./index";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ assert, beforeEach, it, spyFn, stub, stubFn, match }) => {
	const triggerService = { bind: () => {} };

	beforeEach((context) => {
		context.app = new Application(new Container());

		context.app.bind(Identifiers.LogService).toConstantValue({});
		context.app.bind(Identifiers.EventDispatcherService).toConstantValue({ listen: spyFn() });
		context.app.bind(Identifiers.BlockchainService).toConstantValue({});
		context.app.bind(Identifiers.WalletRepository).toConstantValue({});
		context.app.bind(Identifiers.TransactionHandlerProvider).toConstantValue({});
		context.app.bind(Identifiers.TriggerService).toConstantValue(triggerService);
		context.app.bind(Identifiers.TransactionPoolCollator).toConstantValue({});
		context.app.bind(Identifiers.TransactionPoolService).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Block.Serializer).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Block.Deserializer).toConstantValue({});
		context.app.bind(Identifiers.DatabaseInteraction).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Time.Slots).toConstantValue({});

		context.serviceProvider = context.app.resolve<ServiceProvider>(ServiceProvider);
	});

	it("register should bind ForgerService, ForgeNewBlockAction, IsForgingAllowedAction", async (context) => {
		const spyOnBind = stub(triggerService, "bind");

		assert.false(context.app.isBound(Identifiers.Forger.Service));

		await context.serviceProvider.register();

		assert.true(context.app.isBound(Identifiers.Forger.Service));
		spyOnBind.calledTimes(3);
		spyOnBind.calledWith("forgeNewBlock", match.object);
		spyOnBind.calledWith("isForgingAllowed", match.object);
		spyOnBind.calledWith("getCurrentRound", match.object);
	});

	it("boot should call boot on forger service", async (context) => {
		context.app.config("validators", { secrets: [] });
		const forgerService = { boot: () => {} };
		const spyBoot = stub(forgerService, "boot");

		context.app.bind(Identifiers.Forger.Service).toConstantValue(forgerService);

		await context.serviceProvider.boot();

		spyBoot.calledOnce();
	});

	it("boot should create validator from validator.secret and boot", async (context) => {
		const secrets = ["this is a super secret passphrase", "this is a super secret passphrase2"];
		context.app.config("validators", { secrets });

		const forgerService = { boot: () => {} };
		const spyBoot = stub(forgerService, "boot");
		const spyResolve = stub(context.app, "resolve").returnValue({
			configure: stubFn,
		});

		context.app.bind(Identifiers.Forger.Service).toConstantValue(forgerService);

		await context.serviceProvider.boot();

		spyBoot.calledOnce();
		spyResolve.calledTimes(2);
	});

	it("dispose should call dispose on forger service", async (context) => {
		const forgerService = { dispose: () => {} };
		const spyOnDispose = stub(forgerService, "dispose");
		context.app.bind(Identifiers.Forger.Service).toConstantValue(forgerService);

		await context.serviceProvider.dispose();

		spyOnDispose.calledOnce();
	});
});
