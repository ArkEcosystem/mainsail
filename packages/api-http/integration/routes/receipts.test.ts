import { describe, Sandbox } from "../../../test-framework/source";
import receipts from "../../test/fixtures/receipts.json";
import { ApiContext, prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

describe<{
	sandbox: Sandbox;
}>("Receipts", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
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

	it("/receipts", async () => {
		let { statusCode, data } = await request("/receipts", options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		await apiContext.receiptsRepository.save(receipts);

		const testCases = [
			{
				query: "",
				result: receipts,
			},
			{
				query: `?txHash=${receipts[0].id}`,
				result: [receipts[0]],
			},
			{
				query: "?txHash=0000000000000000000000000000000000000000000000000000000000000001",
				result: [],
			},
			{
				query: `?blockHeight=${receipts[0].blockHeight}`,
				result: [receipts[0]],
			},
			{
				query: "?blockHeight.from=1&blockHeight.to=100",
				result: receipts,
			},
			{
				query: "?blockHeight=2",
				result: [],
			},
			{
				query: "?blockHeight.from=1&blockHeight.to=2",
				result: [],
			},
		];

		for (const { query, result } of testCases) {
			const {
				statusCode,
				data: { data },
			} = await request(`/receipts${query}`, options);
			assert.equal(statusCode, 200);
			assert.equal(data, result);
		}
	});
});
