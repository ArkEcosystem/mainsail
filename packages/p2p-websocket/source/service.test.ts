import { Events, Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { defaults } from "./defaults";
import { CloseReason } from "./enums";
import { Service } from "./service";

describe<{
	service: Service;
	server: any;
	repository: any;
	milestone: any;
	listeners: Map<string, any>;
}>("Service", ({ it, assert, beforeEach, spy }) => {
	const makeConnection = (remoteVersion: string | undefined) => {
		const closed: CloseReason[] = [];

		return { close: async (reason: CloseReason) => void closed.push(reason), closed, remoteVersion };
	};

	beforeEach((context) => {
		context.listeners = new Map();
		context.server = { boot: async () => {}, dispose: async () => {}, initialize: () => {} };
		context.repository = { all: () => [] };
		context.milestone = {};

		const app = new Application();
		app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({
			forget: (name: string) => context.listeners.delete(name),
			listen: (name: string, listener: any) => context.listeners.set(name, listener),
		});
		app.bind(Identifiers.P2P.WebSocket.Server).toConstantValue(context.server);
		app.bind(Identifiers.P2P.WebSocket.Router).toConstantValue({});
		app.bind(Identifiers.P2P.WebSocket.Listener).toConstantValue({});
		app.bind(Identifiers.P2P.WebSocket.Dialer).toConstantValue({});
		app.bind(Identifiers.P2P.WebSocket.BanList).toConstantValue({});
		app.bind(Identifiers.P2P.WebSocket.Connection.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({
			getMilestone: () => context.milestone,
			getNetwork: () => ({ name: "devnet" }),
		});
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTagged("plugin", "p2p-websocket");

		context.service = app.resolve(Service);
	});

	it("#initialize - should prepare the server and watch for a new milestone", ({ service, server, listeners }) => {
		const initialize = spy(server, "initialize");

		service.initialize();

		initialize.calledOnce();
		assert.true(listeners.has(Events.CryptoEvent.MilestoneChanged));
	});

	it("should close the connections of peers whose software a new milestone no longer accepts", async ({
		service,
		repository,
		milestone,
		listeners,
	}) => {
		const current = makeConnection("2.6.1");
		const outdated = makeConnection("2.5.9");
		const handshaking = makeConnection(undefined);
		repository.all = () => [current, outdated, handshaking];

		service.initialize();
		milestone.p2p = { minimumVersions: ["^2.6.0"] };
		await listeners.get(Events.CryptoEvent.MilestoneChanged).handle({ name: Events.CryptoEvent.MilestoneChanged });

		assert.equal(outdated.closed, [CloseReason.VersionMismatch]);
		assert.equal(current.closed, []);
		// Its handshake checks the version once the hello is in.
		assert.equal(handshaking.closed, []);
	});

	it("#dispose - should stop watching for milestones and stop the server", async ({ service, server, listeners }) => {
		const dispose = spy(server, "dispose");
		service.initialize();

		await service.dispose();

		assert.false(listeners.has(Events.CryptoEvent.MilestoneChanged));
		dispose.calledOnce();
	});
});
