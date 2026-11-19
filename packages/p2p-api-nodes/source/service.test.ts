import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { constants } from "./constants";
import { Service } from "./service";

describe<{
	service: Service;
	apiNodeDiscoverer: any;
	events: any;
	logger: any;
	listeners: Map<string, any>;
}>("Service", ({ it, assert, beforeEach, clock, spy }) => {
	const MINUTE = 60 * 1000;

	beforeEach((context) => {
		context.listeners = new Map();
		context.apiNodeDiscoverer = {
			discoverApiNodes: async () => {},
			discoverNewApiNodes: async () => {},
			populateApiNodesFromConfiguration: async () => {},
			refreshApiNodes: async () => {},
		};
		context.events = {
			forget: (name: string) => context.listeners.delete(name),
			listen: (name: string, listener: any) => context.listeners.set(name, listener),
		};
		context.logger = { error: () => {} };

		const app = new Application();
		app.bind(Identifiers.P2P.ApiNode.Discoverer).toConstantValue(context.apiNodeDiscoverer);
		app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.service = app.resolve(Service);
	});

	it("#boot - should read the configured nodes, ask peers and check the known nodes", async ({
		service,
		apiNodeDiscoverer,
	}) => {
		const fakeTimers = clock({ toFake: ["setTimeout", "clearTimeout"] });
		const calls: string[] = [];
		for (const name of ["populateApiNodesFromConfiguration", "discoverNewApiNodes", "refreshApiNodes"]) {
			apiNodeDiscoverer[name] = async () => {
				calls.push(name);
			};
		}

		service.boot();
		await fakeTimers.tickAsync(0);

		assert.equal(calls, ["populateApiNodesFromConfiguration", "discoverNewApiNodes", "refreshApiNodes"]);

		service.dispose();
	});

	it("#boot - should check again after 10 to 20 minutes", async ({ service, apiNodeDiscoverer }) => {
		const fakeTimers = clock({ toFake: ["setTimeout", "clearTimeout"] });
		const refreshApiNodes = spy(apiNodeDiscoverer, "refreshApiNodes");

		service.boot();
		await fakeTimers.tickAsync(0);
		refreshApiNodes.calledTimes(1);

		await fakeTimers.tickAsync(constants.CHECK_INTERVAL_MIN_MINUTES * MINUTE - 1);
		refreshApiNodes.calledTimes(1);

		await fakeTimers.tickAsync(
			(constants.CHECK_INTERVAL_MAX_MINUTES - constants.CHECK_INTERVAL_MIN_MINUTES) * MINUTE + 1,
		);
		refreshApiNodes.calledTimes(2);

		service.dispose();
	});

	it("#boot - should log a failed check and check again", async ({ service, apiNodeDiscoverer, logger }) => {
		const fakeTimers = clock({ toFake: ["setTimeout", "clearTimeout"] });
		const error = spy(logger, "error");
		let calls = 0;
		apiNodeDiscoverer.discoverNewApiNodes = async () => {
			calls++;
			throw new Error("boom");
		};

		service.boot();
		await fakeTimers.tickAsync(0);

		error.calledWith("API node check failed: boom", "p2p");

		await fakeTimers.tickAsync(constants.CHECK_INTERVAL_MAX_MINUTES * MINUTE);
		assert.equal(calls, 2);

		service.dispose();
	});

	it("should ask a peer that became active for its api nodes without waiting for the answer", async ({
		service,
		apiNodeDiscoverer,
		listeners,
	}) => {
		const fakeTimers = clock({ toFake: ["setTimeout", "clearTimeout"] });
		const peer = { ip: "1.2.3.4" };
		const asked: unknown[] = [];
		apiNodeDiscoverer.discoverApiNodes = (from: unknown) => {
			asked.push(from);
			return new Promise(() => {});
		};

		service.boot();
		await fakeTimers.tickAsync(0);

		// The listener settles although the discovery never does.
		await listeners.get(Events.PeerEvent.Added).handle({ data: peer, name: Events.PeerEvent.Added });
		assert.equal(asked, [peer]);

		service.dispose();
	});

	it("#dispose - should stop the checks and the listening", async ({ service, apiNodeDiscoverer, listeners }) => {
		const fakeTimers = clock({ toFake: ["setTimeout", "clearTimeout"] });
		const refreshApiNodes = spy(apiNodeDiscoverer, "refreshApiNodes");

		service.boot();
		await fakeTimers.tickAsync(0);
		assert.true(listeners.has(Events.PeerEvent.Added));

		service.dispose();

		assert.false(listeners.has(Events.PeerEvent.Added));
		assert.equal(fakeTimers.countTimers(), 0);

		await fakeTimers.tickAsync(constants.CHECK_INTERVAL_MAX_MINUTES * MINUTE);
		refreshApiNodes.calledTimes(1);
	});
});
