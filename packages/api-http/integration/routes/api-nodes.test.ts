import { describe } from "@mainsail/test-runner";
import apiNodes from "../../test/fixtures/api-nodes.json";
import { ApiContext, prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";
import { Application } from "@mainsail/kernel";

describe<{
	app: Application;
}>("ApiNodes", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
	let apiContext: ApiContext;

	const options = {};

	beforeAll(async (context) => {
		nock.enableNetConnect();
		apiContext = await prepareSandbox(context);
	});

	afterAll((context) => {
		nock.disableNetConnect();
		apiContext.dispose();
	});

	beforeEach(async (context) => {
		await apiContext.reset();
	});

	afterEach(async (context) => {
		await apiContext.reset();
	});

	it("/api-nodes", async () => {
		let { statusCode, data } = await request("/api-nodes", options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		await apiContext.apiNodesRepository.save(apiNodes);

		({ statusCode, data } = await request("/api-nodes", options));
		assert.equal(data.data, apiNodes);
	});
});
