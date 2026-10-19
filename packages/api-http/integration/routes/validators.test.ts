import { describe } from "@mainsail/test-runner";
import { Application } from "@mainsail/kernel";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import validators from "../../test/fixtures/validators.json";
import wallets from "../../test/fixtures/wallets.json";
import blocks from "../../test/fixtures/blocks.json";
import validatorBlocks from "../../test/fixtures/validator_blocks.json";
import validatorBlocksResponse from "../../test/fixtures/validator_blocks.response.json";

describe<{
	app: Application;
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

	it("/validators?attributes filters by a jsonb attribute (escapeLiteral path)", async () => {
		await apiContext.walletRepository.save(validators);

		// Exercises WalletFilter.handleAttributesCriteria -> QueryHelper.getColumnName -> escapeLiteral
		// with a legitimate user-supplied key, to guard against the escaping breaking real queries.
		const { statusCode, data } = await request("/validators?attributes.validatorRank=5", options);
		assert.equal(statusCode, 200);
		assert.equal(
			data.data,
			validators.filter((v) => v.attributes.validatorRank === 5),
		);
	});

	it("/validators?attributes rejects SQL injection in attribute keys", async () => {
		await apiContext.walletRepository.save(validators);

		// Same injectable position as /wallets (attributes route through the shared filter), so the
		// validators endpoint must reject it identically.
		const injectionPaths = [
			`/validators?attributes.${encodeURIComponent("a'||pg_sleep(3)||'b")}=1`, // timing / boolean-blind
			`/validators?attributes.${encodeURIComponent("x'; DROP TABLE wallets; --")}=1`, // stacked statement
			`/validators?attributes.validatorLastBlock.${encodeURIComponent("n')::bigint--")}=1`, // nested key
		];

		for (const path of injectionPaths) {
			let statusCode;
			try {
				statusCode = (await request(path, options)).statusCode; // must never be a 2xx
			} catch (ex) {
				statusCode = ex.response?.statusCode;
			}

			assert.equal(statusCode, 400);
		}

		// Intact and still queryable afterwards.
		const after = await request("/validators", options);
		assert.equal(after.statusCode, 200);
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
			"Request failed with status code 404",
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
