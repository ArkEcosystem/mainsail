import { Server } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { HeaderIncludePlugin } from "./header-include";

describe<{
	app: Application;
	headerIncludePlugin: HeaderIncludePlugin;
	server: Server;
}>("HeaderIncludePlugin", ({ it, assert, beforeEach }) => {
	const headerData = { blockNumber: 3, round: 1, step: 0 };
	const responsePayload = { status: "ok" };

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.P2P.Header.Factory).toConstantValue(() => ({ toData: () => headerData }));

		context.headerIncludePlugin = context.app.resolve(HeaderIncludePlugin);

		// Wired like Server.initialize(): routes register first — each Route.register() calls
		// server.bind(controller), so that controller is what hapi hands to
		// extensions as `this` — and only then the plugin adds its extension.
		const controller = { handle: () => responsePayload };
		context.server = new Server({ port: 4104 });
		context.server.bind(controller);
		context.server.route({
			method: "POST",
			options: { handler: controller.handle.bind(controller) },
			path: "/p2p/peer/mockroute",
		});

		context.headerIncludePlugin.register(context.server);
	});

	it("should include our header in the response", async ({ server }) => {
		const response = await server.inject({
			method: "POST",
			payload: {},
			url: "/p2p/peer/mockroute",
		});

		assert.equal(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), { ...responsePayload, headers: headerData });
	});
});
