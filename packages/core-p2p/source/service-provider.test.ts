import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";
import { describe, Sandbox } from "@arkecosystem/core-test-framework";

import { defaults } from "./defaults";
import { Peer } from "./peer";
import { ServiceProvider } from "./service-provider";

describe<{
	sandbox: Sandbox;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, assert, beforeEach, stub }) => {
	const triggerService = { bind: () => {} };
	const validator = { addFormat: () => {} };
	const server = { boot: async () => {}, dispose: async () => {}, initialize: async () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.TriggerService).toConstantValue(triggerService);
		context.sandbox.app.bind(Identifiers.Cryptography.Validator).toConstantValue(validator);

		context.serviceProvider = context.sandbox.app.resolve(ServiceProvider);
	});

	it("#register - should register", async ({ serviceProvider }) => {
		await assert.resolves(() => serviceProvider.register());
	});

	it("#bootWhen - should return false when process.env.DISABLE_P2P_SERVER", async ({ serviceProvider }) => {
		process.env.DISABLE_P2P_SERVER = "true";
		assert.false(await serviceProvider.bootWhen());

		delete process.env.DISABLE_P2P_SERVER;
	});

	it("#bootWhen - should return true when !process.env.DISABLE_P2P_SERVER", async ({ serviceProvider }) => {
		assert.true(await serviceProvider.bootWhen());
	});

	it("#boot - should call the server boot method", async ({ sandbox, serviceProvider }) => {
		const peerEventListener = { initialize: () => {} };

		const spyPeerEventListenerInitialize = stub(peerEventListener, "initialize");
		const spyServerInitialize = stub(server, "initialize");
		const spyServerBoot = stub(server, "boot");

		sandbox.app.bind(Identifiers.PeerEventListener).toConstantValue(peerEventListener);
		sandbox.app.bind(Identifiers.P2PServer).toConstantValue(server);

		const config = sandbox.app.resolve(Providers.PluginConfiguration).from("", defaults);
		serviceProvider.setConfig(config);

		await serviceProvider.boot();

		spyPeerEventListenerInitialize.calledOnce();
		spyServerInitialize.calledOnce();
		spyServerBoot.calledOnce();
	});

	it("#dispose - should call the server dispose method when process.env.DISABLE_P2P_SERVER is undefined", async ({
		sandbox,
		serviceProvider,
	}) => {
		const spyServerDispose = stub(server, "dispose");
		sandbox.app.bind(Identifiers.P2PServer).toConstantValue(server);

		await serviceProvider.dispose();

		spyServerDispose.calledOnce();
	});

	it("#dispose - should not call the server dispose method when process.env.DISABLE_P2P_SERVER = true", async ({
		sandbox,
		serviceProvider,
	}) => {
		const spyServerDispose = stub(server, "dispose");
		sandbox.app.bind(Identifiers.P2PServer).toConstantValue(server);

		process.env.DISABLE_P2P_SERVER = "true";
		await serviceProvider.dispose();

		spyServerDispose.neverCalled();

		delete process.env.DISABLE_P2P_SERVER; // reset to initial undefined value
	});

	it("#required - should return true", async ({ serviceProvider }) => {
		assert.true(await serviceProvider.required());
	});

	it("#peerFactory - should create a peer with integer port number, when using string config", async ({
		sandbox,
		serviceProvider,
	}) => {
		const config = sandbox.app.resolve(Providers.PluginConfiguration).from("", defaults);
		serviceProvider.setConfig(config);
		await serviceProvider.register();

		const ip = "188.133.1.2";
		const peer = sandbox.app.get<Contracts.P2P.PeerFactory>(Identifiers.PeerFactory)(ip);

		assert.instance(peer, Peer);
		assert.number(peer.port);
		assert.equal(peer.port, 4002);
	});
});
