import { Application, Container, Providers } from "@arkecosystem/core-kernel";
import { Pm2ProcessActionsService } from "@arkecosystem/core-kernel/distribution/services/process-actions/drivers/pm2";
import { describe } from "../../core-test-framework";
import importFresh from "import-fresh";
import { AnySchema } from "joi";
import sinon from "sinon";

import { DelegateFactory } from "./delegate-factory";
import { ServiceProvider } from "./service-provider";

const loadDefaults = (): { defaults: Record<string, any> } => importFresh("./defaults");

const bip39DelegateMock = { address: "D6Z26L69gdk8qYmTv5uzk3uGepigtHY4ax" } as any;
const bip38DelegateMock = { address: "D6Z26L69gbk8qYmTv5uzk3uGepigtHY4ax" } as any;

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ assert, beforeEach, it, spyFn, stub }) => {
	const triggerService = { bind: spyFn() };

	beforeEach((context) => {
		context.app = new Application(new Container.Container());

		context.app.bind(Container.Identifiers.LogService).toConstantValue({});
		context.app.bind(Container.Identifiers.EventDispatcherService).toConstantValue({ listen: spyFn() });
		context.app.bind(Container.Identifiers.BlockchainService).toConstantValue({});
		context.app.bind(Container.Identifiers.WalletRepository).toConstantValue({});
		context.app.bind(Container.Identifiers.TransactionHandlerProvider).toConstantValue({});
		context.app.bind(Container.Identifiers.TriggerService).toConstantValue(triggerService);
		context.app
			.bind(Container.Identifiers.PluginConfiguration)
			.to(Providers.PluginConfiguration)
			.inSingletonScope();
		context.app.bind(Container.Identifiers.ProcessActionsService).to(Pm2ProcessActionsService).inSingletonScope();

		context.app.config("delegates", { secrets: [], bip38: "dummy bip 38" });
		context.app.config("app", { flags: { bip38: "dummy bip 38", password: "dummy pwd" } });

		context.serviceProvider = context.app.resolve<ServiceProvider>(ServiceProvider);

		const pluginConfiguration = context.app.resolve<Providers.PluginConfiguration>(Providers.PluginConfiguration);
		pluginConfiguration.from("core-forger", {
			hosts: [],
			tracker: true,
		});
		context.serviceProvider.setConfig(pluginConfiguration);

		stub(DelegateFactory, "fromBIP39").returnValueOnce(bip39DelegateMock);
		stub(DelegateFactory, "fromBIP38").returnValueOnce(bip38DelegateMock);

		for (const key of Object.keys(process.env)) {
			if (key === "CORE_P2P_PORT") {
				delete process.env[key];
			}
		}
	});

	it("register should bind ForgerService, ForgeNewBlockAction, IsForgingAllowedAction", async (context) => {
		assert.false(context.app.isBound(Container.Identifiers.ForgerService));

		await context.serviceProvider.register();

		assert.true(context.app.isBound(Container.Identifiers.ForgerService));
		assert.true(triggerService.bind.calledTwice);
		assert.true(triggerService.bind.calledWith("forgeNewBlock", sinon.match.any));
		assert.true(triggerService.bind.calledWith("isForgingAllowed", sinon.match.any));
	});

	it("boot should call boot on forger service", async (context) => {
		context.app.config("delegates", { secrets: ["this is a super secret passphrase"], bip38: "dummy bip 38" });

		const forgerService = { boot: spyFn(), register: spyFn() };
		context.app.bind(Container.Identifiers.ForgerService).toConstantValue(forgerService);

		await context.serviceProvider.boot();

		assert.true(forgerService.register.calledOnce);
		assert.true(forgerService.boot.calledOnce);
	});

	it("boot should create delegates from delegates.secret and flags.bip38 / flags.password", async (context) => {
		const secrets = ["this is a super secret passphrase", "this is a super secret passphrase2"];
		context.app.config("delegates", { secrets, bip38: "dummy bip 38" });

		const flagsConfig = { bip38: "dummy bip38", password: "dummy password" };
		context.app.config("app.flags", flagsConfig);

		const forgerService = { boot: spyFn(), register: spyFn() };
		context.app.bind(Container.Identifiers.ForgerService).toConstantValue(forgerService);

		const anotherBip39DelegateMock = { address: "D6Z26L69gdk8qYmTv5uzk3uGepigtHY4fe" } as any;
		// @ts-ignore
		DelegateFactory.fromBIP39.restore();
		const stub1 = sinon.stub(DelegateFactory, "fromBIP39");
		stub1.onFirstCall().returns(anotherBip39DelegateMock);
		stub1.onSecondCall().returns(bip39DelegateMock);

		await context.serviceProvider.boot();

		assert.true(forgerService.register.calledOnce);
		assert.true(forgerService.boot.calledOnce);
		assert.true(forgerService.boot.calledWith([anotherBip39DelegateMock, bip39DelegateMock, bip38DelegateMock]));
	});

	it("boot should call boot on forger service with empty array when no delegates are configured", async (context) => {
		context.app.config("delegates", { secrets: [], bip38: undefined });
		context.app.config("app", { flags: { bip38: undefined, password: undefined } });

		const forgerService = { boot: spyFn(), register: spyFn() };
		context.app.bind(Container.Identifiers.ForgerService).toConstantValue(forgerService);

		await context.serviceProvider.boot();

		assert.true(forgerService.register.calledOnce);
		assert.true(forgerService.boot.calledOnce);
		assert.true(forgerService.boot.calledWith([]));
	});

	it("dispose should call dispose on forger service", async (context) => {
		const forgerService = { dispose: spyFn() };
		context.app.bind(Container.Identifiers.ForgerService).toConstantValue(forgerService);

		await context.serviceProvider.dispose();

		assert.true(forgerService.dispose.calledOnce);
	});

	it("bootWhen should return false when there is not bip38 or secrets defined", async (context) => {
		context.app.config("delegates", { secrets: [], bip38: undefined });

		const bootWhenResult = await context.serviceProvider.bootWhen();

		assert.false(bootWhenResult);
	});

	it("bootWhen should return true when bip38 or secrets defined", async (context) => {
		context.app.config("delegates", { secrets: [], bip38: "yeah bip 38 defined" });

		const bootWhenResultBip38 = await context.serviceProvider.bootWhen();

		assert.true(bootWhenResultBip38);

		context.app.config("delegates", { secrets: ["shhhh"], bip38: undefined });

		const bootWhenResultSecrets = await context.serviceProvider.bootWhen();

		assert.true(bootWhenResultSecrets);
	});

	it("configSchema should validate schema using defaults", async (context) => {
		const result = (context.serviceProvider.configSchema() as AnySchema).validate(loadDefaults().defaults);

		assert.undefined(result.error);

		assert.array(result.value.hosts);
		assert.true(result.value.hosts.length >= 1);
		result.value.hosts.forEach((item) => {
			assert.string(item.hostname);
			assert.number(item.port);
		});

		assert.boolean(result.value.tracker);

		assert.undefined(result.value.bip38);
		assert.undefined(result.value.password);
	});

	it("configSchema should allow configuration extension", async (context) => {
		const defaults = loadDefaults().defaults;

		// @ts-ignore
		defaults.customField = "dummy";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);
		assert.equal(result.value.customField, "dummy");
	});

	it("configSchema should parse process.env.CORE_API_PORT", async (context) => {
		process.env.CORE_P2P_PORT = "5000";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(loadDefaults().defaults);

		assert.undefined(result.error);
		assert.equal(result.value.hosts[0].port, 5000);
	});

	it("should throw if process.env.CORE_API_PORT is not number", async (context) => {
		process.env.CORE_P2P_PORT = "false";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(loadDefaults().defaults);

		assert.defined(result.error);
		assert.equal(result.error!.message, '"hosts[0].port" must be a number');
	});
});

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	defaults: Record<string, any>;
}>("schema restrictions", ({ assert, beforeEach, it }) => {
	beforeEach(async (context) => {
		context.app = new Application(new Container.Container());
		context.serviceProvider = context.app.resolve<ServiceProvider>(ServiceProvider);

		for (const key of Object.keys(process.env)) {
			if (key === "CORE_P2P_PORT") {
				delete process.env[key];
			}
		}

		context.defaults = loadDefaults().defaults;
	});

	it("schema restrictions hosts is required && must be array", async (context) => {
		context.defaults.hosts = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"hosts" must be an array');

		delete context.defaults.hosts;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"hosts" is required');
	});

	it("schema restrictions hosts.hostname is required && is ipv4 or ipv6 string", async (context) => {
		context.defaults.hosts = [{ hostname: false }];
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"hosts[0].hostname" must be a string');

		context.defaults.hosts = [{ hostname: "not an IP" }];
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(
			result.error!.message,
			'"hosts[0].hostname" must be a valid ip address of one of the following versions [ipv4, ipv6] with a optional CIDR',
		);

		context.defaults.hosts = [{}];
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"hosts[0].hostname" is required');
	});

	it("schema restrictions hosts.port is required && is integer && is >= 0 and <= 65535", async (context) => {
		context.defaults.hosts = [{ hostname: "127.0.0.1", port: false }];
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"hosts[0].port" must be a number');

		context.defaults.hosts = [{ hostname: "127.0.0.1", port: 1.12 }];
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"hosts[0].port" must be an integer');

		context.defaults.hosts = [{ hostname: "127.0.0.1", port: 0 }];
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"hosts[0].port" must be greater than or equal to 1');

		context.defaults.hosts = [{ hostname: "127.0.0.1", port: 655356 }];
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"hosts[0].port" must be less than or equal to 65535');

		context.defaults.hosts = [{ hostname: "127.0.0.1" }];
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"hosts[0].port" is required');
	});

	it("schema restrictions tracker is required && is boolean", async (context) => {
		context.defaults.tracker = 123;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"tracker" must be a boolean');

		delete context.defaults.tracker;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"tracker" is required');
	});

	it("schema restrictions bip38 is optional && is string", async (context) => {
		context.defaults.bip38 = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"bip38" must be a string');

		delete context.defaults.bip38;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.undefined(result.error);
	});

	it("schema restrictions password is optional && is string", async (context) => {
		context.defaults.password = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error!.message, '"password" must be a string');

		delete context.defaults.password;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.undefined(result.error);
	});
});
