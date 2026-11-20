import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ApiNodesController } from "./api-nodes";

describe<{
	app: Application;
}>("ApiNodesController", ({ it, beforeEach, assert }) => {
	const list = async (controller: ApiNodesController): Promise<{ results: unknown[]; totalCount: number }> =>
		(await controller.index({ query: {} } as any)) as any;

	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({});
		context.app.bind(Identifiers.State.Store).toConstantValue({});
	});

	it("should list no nodes when the api node directory is not loaded", async ({ app }) => {
		const page = await list(app.resolve(ApiNodesController));

		assert.equal(page.results, []);
		assert.equal(page.totalCount, 0);
	});

	it("should list the nodes of the directory, fastest first", async ({ app }) => {
		app.bind(Identifiers.P2P.ApiNode.Repository).toConstantValue({
			getApiNodes: () => [
				{ latency: 30, url: "http://1.2.3.4:4003/" },
				{ latency: 10, url: "http://5.6.7.8:4003/" },
			],
		});

		const page = await list(app.resolve(ApiNodesController));

		assert.equal(page.totalCount, 2);
		assert.length(page.results, 2);
	});
});
