import { Identifiers } from "@mainsail/constants";
import { Providers } from "@mainsail/kernel";
import esmock from "esmock";

import { Application } from "@mainsail/kernel";
import { describeSkip } from "@mainsail/test-runner";
import { defaults as transactionPoolDefaults } from "../../../transaction-pool-service/source/defaults";
import { defaults } from "../defaults";

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

const { Server: ServerProxy } = await esmock("./server", {
	"@hapi/hapi": {
		Server: () => {
			throw new Error("Not implemented");
		},
	},
});

// TODO: Fix this test
describeSkip<{ app: Application; server: ServerProxy }>("Server", ({ it, assert, beforeEach, spy, stub, stubFn }) => {
	const name = "P2P server";
	const options = { hostname: "127.0.0.1", port: 4000 };

	const logger = { debug: () => {}, info: () => {}, warn: () => {} };
	const config = {
		getRoundValidators: () => 51,
		getMilestone: () => ({
			roundValidators: 51,
		}),
	};

	beforeEach((context) => {
		context.app = new Application();

		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTargetTagged("plugin", "p2p");
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(new Providers.PluginConfiguration().from("", transactionPoolDefaults))
			.whenTargetTagged("plugin", "transaction-pool-service");
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);
		context.app.bind(Identifiers.Database.Service).toConstantValue({});
		context.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({});
		context.app.bind(Identifiers.P2P.ApiNode.Repository).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(config);
		context.app.bind(Identifiers.Cryptography.Block.Deserializer).toConstantValue({});
		context.app.bind(Identifiers.TransactionPool.Processor).toConstantValue({});
		context.app.bind(Identifiers.State.Service).toConstantValue({});
		context.app.bind(Identifiers.P2P.Peer.Processor).toConstantValue({});
		context.app.bind(Identifiers.Consensus.Processor.Proposal).toConstantValue({});
		context.app.bind(Identifiers.Consensus.Processor.Message).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Message.Serializer).toConstantValue({});
		context.app.bind(Identifiers.P2P.Header.Service).toConstantValue({});
		context.app.bind(Identifiers.P2P.Header.Factory).toConstantValue({});
		context.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue({});
		context.app.bind(Identifiers.P2P.State).toConstantValue({});

		context.server = context.app.resolve(ServerProxy);
	});

	it.only("#initialize - should instantiate a new Hapi server", async ({ server }) => {
		// const spyHapiServerRegister = spy(HapiServerMock.prototype, "register");

		await server.initialize(name, options);

		// spyRegister.calledOnce();
		// spyHapiServerRegister.calledOnce();
		// spyHapiServerRegister.calledWith({
		// 	options: { maxPayload: constants.MAX_PAYLOAD_SERVER },
		// 	plugin: plugin,
		// });
	});

	it("#boot - should call server.start()", async ({ server, app }) => {
		const spyHapiServerStart = spy(HapiServerMock.prototype, "start");
		const spyAppTerminate = spy(app, "terminate");

		await server.initialize(name, options);
		await server.boot();

		spyHapiServerStart.calledOnce();
		spyAppTerminate.neverCalled();
	});

	it("#boot - should terminate app if server.start() failed", async ({ server, app }) => {
		const spyHapiServerStart = stub(HapiServerMock.prototype, "start").rejectedValue(
			new Error("failed starting hapi server"),
		);
		const spyAppTerminate = stub(app, "terminate").callsFake(() => {});

		await server.initialize(name, options);
		await server.boot();

		spyHapiServerStart.calledOnce();
		spyAppTerminate.calledOnce();
	});

	it("#dispose - should call server.stop()", async ({ server, app }) => {
		const spyHapiServerStop = spy(HapiServerMock.prototype, "stop");
		const spyAppTerminate = spy(app, "terminate");

		await server.initialize(name, options);
		await server.dispose();

		spyHapiServerStop.calledOnce();
		spyAppTerminate.neverCalled();
	});

	it("#dispose -should terminate app if server.stop() failed", async ({ server, app }) => {
		const spyHapiServerStop = stub(HapiServerMock.prototype, "stop").rejectedValue(
			new Error("failed stopping hapi server"),
		);
		const spyAppTerminate = stub(app, "terminate").callsFake(() => {});

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
