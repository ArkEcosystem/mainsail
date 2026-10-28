import type { Contracts } from "@mainsail/contracts";

import { Server } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import Joi from "joi";

import { Route } from "./route";

const MAX_BYTES = 16;

@injectable()
class TestRoute extends Route {
	public getRoutesConfigByPath(): { [path: string]: Contracts.P2P.RouteConfig } {
		return {
			"/test": {
				codec: {} as Contracts.P2P.RouteConfig["codec"],
				id: "p2p.test",
				maxBytes: MAX_BYTES,
				validation: Joi.binary(),
			},
		};
	}

	protected getController(): Contracts.P2P.Controller {
		return { handle: async () => "ok" } as unknown as Contracts.P2P.Controller;
	}
}

describe<{
	app: Application;
	peerDisposer: { banPeer: (ip: string, error: Error) => void };
	server: Server;
}>("Route", ({ it, assert, beforeEach, spy, match }) => {
	beforeEach((context) => {
		context.peerDisposer = { banPeer: () => {} };

		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => false })
			.whenTagged("plugin", "p2p");
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});
		context.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);

		context.server = new Server({ port: 4105 });
		context.app.resolve(TestRoute).register(context.server);
	});

	const inject = (server: Server, size: number) =>
		server.inject({
			allowInternals: true,
			headers: { "content-type": "application/octet-stream" },
			method: "POST",
			payload: Buffer.alloc(size),
			remoteAddress: "1.2.3.4",
			url: "/test",
		});

	it("should serve a payload within the limit", async ({ server, peerDisposer }) => {
		const banPeer = spy(peerDisposer, "banPeer");

		const response = await inject(server, MAX_BYTES);

		assert.equal(response.statusCode, 200);
		banPeer.neverCalled();
	});

	it("should reject an oversized payload and ban the peer", async ({ server, peerDisposer }) => {
		const banPeer = spy(peerDisposer, "banPeer");

		const response = await inject(server, MAX_BYTES + 1);

		assert.equal(response.statusCode, 413);
		banPeer.calledOnce();
		banPeer.calledWith("1.2.3.4", match.instanceOf(Error));
	});
});
