import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { GetApiNodesRoute } from "./get-api-nodes";

describe<{
	app: Application;
}>("GetApiNodesRoute", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.app = new Application();
	});

	it("should answer with an empty list when no api node directory is loaded", async ({ app }) => {
		const route = app.resolve(GetApiNodesRoute);

		assert.equal(await route.handle(), { apiNodes: [] });
	});

	it("should answer with the public api nodes of the directory", async ({ app }) => {
		const apiNodes = [{ url: "http://1.2.3.4:4003/" }, { url: "https://api.example.com/api" }];
		app.bind(Identifiers.P2P.ApiNode.Repository).toConstantValue({ getPublicApiNodes: () => apiNodes });

		const route = app.resolve(GetApiNodesRoute);

		assert.equal(await route.handle(), { apiNodes });
	});
});
