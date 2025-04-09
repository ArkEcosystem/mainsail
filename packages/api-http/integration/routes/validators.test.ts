import { describe, Sandbox } from "../../../test-framework/source";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import validators from "../../test/fixtures/validators.json";
import wallets from "../../test/fixtures/wallets.json";
import blocks from "../../test/fixtures/blocks.json";
import validatorBlocks from "../../test/fixtures/validator_blocks.json";
import validatorBlocksResponse from "../../test/fixtures/validator_blocks.response.json";

describe<{
	sandbox: Sandbox;
}>("Validators", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
	let apiContext: ApiContext;

	let options = {};

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

	it("/validators", async () => {
		await apiContext.walletRepository.save(validators);

		const { statusCode, data } = await request("/validators", options);
		assert.equal(statusCode, 200);

		const sorted = [...validators];
		sorted.sort((a, b) => +a.attributes.validatorRank - +b.attributes.validatorRank);
		assert.equal(data.data, sorted);
	});

	it("/validators?orderBy", async () => {
		await apiContext.walletRepository.save(validators);

		const { data } = await request("/validators?orderBy=attributes.validatorLastBlock.number:desc", options);

		const sorted = [...validators];
		sorted.sort((a, b) => +b.attributes.validatorLastBlock.number - a.attributes.validatorLastBlock.number);
		assert.equal(data.data, sorted);
	});

	it("/validators/{id}", async () => {
		await apiContext.walletRepository.save(validators);

		const validator = validators[0];

		const testCases = [
			{
				id: validator.address,
				result: validator,
			},
			{
				id: validator.publicKey,
				result: validator,
			},
			{
				id: validator.attributes.username,
				result: validator,
			},
		];

		for (const { id, result } of testCases) {
			const {
				statusCode,
				data: { data },
			} = await request(`/validators/${id}`, options);
			assert.equal(statusCode, 200);
			assert.equal(data, result);
		}
	});

	it("/validators/{id}/voters", async () => {
		await apiContext.walletRepository.save(validators);
		await apiContext.walletRepository.save(wallets);

		await assert.rejects(
			async () => request(`/validators/0x0000000000000000000000000000000000000001/voters`, options),
			"Response code 404 (Not Found)",
		);

		const validator = validators[0];
		const { statusCode, data } = await request(`/validators/${validator.address}/voters`, options);
		assert.equal(statusCode, 200);
		assert.equal(
			data.data,
			wallets.filter((wallet) => wallet.attributes.vote === validator.address),
		);
	});

	it("/validators/{id}/blocks", async () => {
		await apiContext.walletRepository.save(validators);
		await apiContext.blockRepository.save(blocks);
		await apiContext.blockRepository.save(validatorBlocks);

		const validator = validators[0];

		const { statusCode, data } = await request(`/validators/${validator.address}/blocks`, {});
		assert.equal(statusCode, 200);
		assert.equal(data.data, validatorBlocksResponse);
	});
});
