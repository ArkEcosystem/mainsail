import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { PeersController } from "./peers";

describe<{
	app: Application;
	controller: PeersController;
}>("PeersController", ({ it, beforeEach, assert }) => {
	const peers = [
		{ header: { blockNumber: 7 }, ip: "127.0.0.1", latency: 30, version: "0.0.1-rc.10" },
		{ header: { blockNumber: 9 }, ip: "127.0.0.2", latency: 10, version: "0.0.1-rc.9" },
		{ header: { blockNumber: 8 }, ip: "127.0.0.3", latency: 20, version: undefined },
	];

	const list = async (controller: PeersController, orderBy?: string | string[]) => {
		const page = (await controller.index({ query: { orderBy } } as any)) as any;
		return page.results.map((peer) => peer.ip);
	};

	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({ getPeers: () => peers });
		context.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue({});
		context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({});
		context.app.bind(Identifiers.State.Store).toConstantValue({});

		context.controller = context.app.resolve(PeersController);
	});

	it("should sort by block number as height or blockNumber", async ({ controller }) => {
		assert.equal(await list(controller, "height:desc"), ["127.0.0.2", "127.0.0.3", "127.0.0.1"]);
		assert.equal(await list(controller, "blockNumber:asc"), ["127.0.0.1", "127.0.0.3", "127.0.0.2"]);
	});

	it("should sort by version, peers without a version lowest", async ({ controller }) => {
		assert.equal(await list(controller, "version:desc"), ["127.0.0.1", "127.0.0.2", "127.0.0.3"]);
		assert.equal(await list(controller, "version:asc"), ["127.0.0.3", "127.0.0.2", "127.0.0.1"]);
	});

	it("should apply the first of several orders", async ({ controller }) => {
		assert.equal(await list(controller, ["latency:desc", "version:asc"]), ["127.0.0.1", "127.0.0.3", "127.0.0.2"]);
	});
});
