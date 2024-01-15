import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import rewiremock from "rewiremock";

import { describe, Sandbox } from "../../../test-framework";
import { defaults as transactionPoolDefaults } from "../../../transaction-pool/source/defaults";
import { constants } from "../constants";
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
	const config = {
		getMaxActiveValidators: () => 51,
		getMilestone: () => ({
			activeValidators: 51,
		}),
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app
			.bind(Identifiers.PluginConfiguration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTargetTagged("plugin", "p2p");
		context.sandbox.app
			.bind(Identifiers.PluginConfiguration)
			.toConstantValue(new Providers.PluginConfiguration().from("", transactionPoolDefaults))
			.whenTargetTagged("plugin", "transaction-pool");
		context.sandbox.app.bind(Identifiers.Kernel.Log.Service).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.ApiNode.Repository).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(config);
		context.sandbox.app.bind(Identifiers.Cryptography.Block.Deserializer).toConstantValue({});
		context.sandbox.app.bind(Identifiers.TransactionPool.Processor).toConstantValue({});
		context.sandbox.app.bind(Identifiers.State.Service).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.Peer.Processor).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Consensus.ProposalProcessor).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Consensus.PrevoteProcessor).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Consensus.PrecommitProcessor).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Cryptography.Message.Serializer).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.Header.Service).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.Header.Factory).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.State).toConstantValue({});

		context.server = context.sandbox.app.resolve(ServerProxy);
	});

	it("#initialize - should instantiate a new Hapi server", async ({ server }) => {
		const spyHapiServerRegister = spy(HapiServerMock.prototype, "register");

		await server.initialize(name, options);

		spyHapiServerRegister.calledOnce();
		spyHapiServerRegister.calledWith({
			options: { maxPayload: constants.MAX_PAYLOAD_SERVER },
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
