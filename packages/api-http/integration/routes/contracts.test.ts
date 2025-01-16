import { describe, Sandbox } from "../../../test-framework/source";
import contracts from "../../test/fixtures/contracts.json";
import contractsResponse from "../../test/fixtures/contracts-response.json";
import { ApiContext, prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

describe<{
	sandbox: Sandbox;
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

	it("/contracts", async () => {
		let { statusCode, data } = await request("/contracts", options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		await apiContext.contractRepository.save(contracts);

		({ statusCode, data } = await request("/contracts", options));
		assert.equal(data.data, contractsResponse);
	});

	it("/contracts/{name}/{implementation}/abi", async () => {
		await apiContext.contractRepository.save(contracts);

		let contract = contracts[contracts.length - 1];
		let { data } = await request(`/contracts/${contract.name}/${contract.activeImplementation}/abi`, options);
		assert.equal(data.data, { abi: contract.implementations[0].abi });

		contract = contracts[0];
		({ data } = await request(`/contracts/${contract.name}/${contract.implementations[1].address}/abi`, options));
		assert.equal(data.data, { abi: contract.implementations[1].abi });
	});
});
