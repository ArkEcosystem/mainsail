import { Contracts, Identifiers } from "@mainsail/core-contracts";
import { Providers } from "@mainsail/core-kernel";
import { describe, Sandbox } from "../../../core-test-framework";
import rewiremock from "rewiremock";

import { defaults as transactionPoolDefaults } from "../../../core-transaction-pool/source/defaults";
import { defaults } from "../defaults";
import { plugin } from "../hapi-nes";
import { Server } from "./server";

class HapiServerMock {
	info = { uri: "127.0.0.1" };

	register() {}
	start() {}
	stop() {}
	bind() {}
	route() {}
	inject() {}
	ext() {}
}

const { Server: ServerProxy } = rewiremock.proxy<{ Server: Contracts.Types.Class<Server> }>("./server", {
	"@hapi/hapi": {
		Server: HapiServerMock,
	},
});

describe<{ sandbox: Sandbox; server: Server }>("Server", ({ it, assert, beforeEach, spy, stub }) => {
	const name = "P2P server";
	const options = { hostname: "127.0.0.1", port: 4000 };

	const logger = { debug: () => {}, info: () => {}, warning: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app
			.bind(Identifiers.PluginConfiguration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTargetTagged("plugin", "core-p2p");
		context.sandbox.app
			.bind(Identifiers.PluginConfiguration)
			.toConstantValue(new Providers.PluginConfiguration().from("", transactionPoolDefaults))
			.whenTargetTagged("plugin", "core-transaction-pool");
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue({});
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Cryptography.Time.Slots).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Cryptography.Block.Deserializer).toConstantValue({});
		context.sandbox.app.bind(Identifiers.TransactionPoolProcessor).toConstantValue({});
		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue({});
		context.sandbox.app.bind(Identifiers.PeerProcessor).toConstantValue({});

		context.server = context.sandbox.app.resolve(ServerProxy);
	});

	it("#initialize - should instantiate a new Hapi server", async ({ server }) => {
		const spyHapiServerRegister = spy(HapiServerMock.prototype, "register");

		await server.initialize(name, options);

		spyHapiServerRegister.calledOnce();
		spyHapiServerRegister.calledWith({
			options: { maxPayload: 20_971_520 },
			plugin: plugin,
		});
	});

	it("#boot - should call server.start()", async ({ server, sandbox }) => {
		const spyHapiServerStart = spy(HapiServerMock.prototype, "start");
		const spyAppTerminate = spy(sandbox.app, "terminate");

		await server.initialize(name, options);
		await server.boot();

		spyHapiServerStart.calledOnce();
		spyAppTerminate.neverCalled();
	});

	it("#boot - should terminate app if server.start() failed", async ({ server, sandbox }) => {
		const spyHapiServerStart = stub(HapiServerMock.prototype, "start").rejectedValue(
			new Error("failed starting hapi server"),
		);
		const spyAppTerminate = stub(sandbox.app, "terminate").callsFake(() => {});

		await server.initialize(name, options);
		await server.boot();

		spyHapiServerStart.calledOnce();
		spyAppTerminate.calledOnce();
	});

	it("#dispose - should call server.stop()", async ({ server, sandbox }) => {
		const spyHapiServerStop = spy(HapiServerMock.prototype, "stop");
		const spyAppTerminate = spy(sandbox.app, "terminate");

		await server.initialize(name, options);
		await server.dispose();

		spyHapiServerStop.calledOnce();
		spyAppTerminate.neverCalled();
	});

	it("#dispose -should terminate app if server.stop() failed", async ({ server, sandbox }) => {
		const spyHapiServerStop = stub(HapiServerMock.prototype, "stop").rejectedValue(
			new Error("failed stopping hapi server"),
		);
		const spyAppTerminate = stub(sandbox.app, "terminate").callsFake(() => {});

		await server.initialize(name, options);
		await server.dispose();

		spyHapiServerStop.calledOnce();
		spyAppTerminate.calledOnce();
	});

	it("#register - should call server.register() with the options provided - for each server", async ({ server }) => {
		await server.initialize(name, options);
		const spyHapiServerRegister = spy(HapiServerMock.prototype, "register");

		const plugin = { name: "my plugin" };
		await server.register(plugin);

		spyHapiServerRegister.calledOnce();
		spyHapiServerRegister.calledWith(plugin);
	});

	it("#route - should call server.register() with the options provided - for each server", async ({ server }) => {
		await server.initialize(name, options);
		const spyHapiServerRoute = spy(HapiServerMock.prototype, "route");

		const route = { method: "POST", path: "/the/path" };
		await server.route(route);

		spyHapiServerRoute.calledOnce();
		spyHapiServerRoute.calledWith(route);
	});

	it("#inject - should call server.register() with the options provided - for each server", async ({ server }) => {
		await server.initialize(name, options);
		const spyHapiServerInject = spy(HapiServerMock.prototype, "inject");

		const toInject = { name: "thing to inject" };
		await server.inject(toInject);

		spyHapiServerInject.calledOnce();
		spyHapiServerInject.calledWith(toInject);
	});
});
