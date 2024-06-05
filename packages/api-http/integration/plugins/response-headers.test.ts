import got from "got";

import { describe, Sandbox } from "../../../test-framework/source";
import blocks from "../../test/fixtures/blocks.json";
import { ApiContext, prepareSandbox } from "../../test/helpers/prepare-sandbox";

describe<{
	sandbox: Sandbox;
}>("ResponseHeaders", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
	let apiContext: ApiContext;

	beforeAll(async (context) => {
		nock.enableNetConnect();
		apiContext = await prepareSandbox(context);
	});

	afterAll(() => {
		nock.disableNetConnect();
		apiContext.dispose();
	});

	beforeEach(async () => {
		await apiContext.reset();
	});

	afterEach(async () => {
		await apiContext.reset();
	});

	it("adds X-Block-Height header", async () => {
		await apiContext.blockRepository.save(blocks[0]);

		const { statusCode, headers } = await got("http://localhost:4003/");
		assert.equal(statusCode, 200);

		const blockHeight = headers["x-block-height"];
		assert.equal(blockHeight, blocks[0].height);
	});
});
