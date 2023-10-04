import { describe, Sandbox } from "../../../test-framework";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import blocks from "../../test/fixtures/blocks.json";

describe<{
	sandbox: Sandbox;
}>("Blockchain", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
	let apiContext: ApiContext;

	// TODO:
	let options = { transform: false };

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

	it("/blockchain", async () => {
		await apiContext.blockRepository.save(blocks);

		const block = blocks[0];
		await apiContext.stateRepository.save({ id: 1, height: +block.height, supply: "1500000" });

		const { statusCode, data } = await request("/blockchain", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, { block: { id: block.id, height: block.height }, supply: "1500000" });
	});
});
