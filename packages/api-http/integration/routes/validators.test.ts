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

	it("/validators?orderBy names", async () => {
		const wei = (value: string) => `${value}000000000000000000`;
		const fees = ["900", "10000", "5", "80", "7000", "60", "3", "400"].map(wei);
		const rewards = ["3", "70", "800", "1", "20000", "9", "600", "50"].map(wei);
		const votes = ["40", "5000", "1", "300", "70", "20000", "8", "600"].map(wei);
		const approvals = [1.5, 0.25, 10.75, 3, 0.5, 2.25, 7, 0.125];
		const produced = [9, 30, 4, 12, 1, 7, 25, 2];
		const lastBlocks = [54, 2, 3, 400, 5, 61, 7, 1000];
		const hashes = ["c1", "a2", "f3", "b4", "e5", "d6", "07", "98"].map((prefix) => prefix.padEnd(64, "0"));

		const rows = validators.map((validator, index) => ({
			...validator,
			attributes: {
				...validator.attributes,
				validatorApproval: approvals[index],
				validatorForgedFees: fees[index],
				validatorForgedRewards: rewards[index],
				validatorForgedTotal: (BigInt(fees[index]) + BigInt(rewards[index])).toString(),
				validatorLastBlock: { hash: hashes[index], number: lastBlocks[index], timestamp: 0 },
				validatorProducedBlocks: produced[index],
				validatorResigned: index % 3 === 0,
				validatorVoteBalance: votes[index],
			},
		}));
		await apiContext.walletRepository.save(rows);

		const sortedBy = (key: (row: (typeof rows)[number]) => bigint | number | string, direction = "asc") =>
			[...rows]
				.sort((a, b) => {
					const order = key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
					return direction === "asc" ? order : -order;
				})
				.map((row) => row.address);

		const testCases = [
			{ orderBy: "address:asc", result: sortedBy((row) => row.address.toLowerCase()) },
			{ orderBy: "publicKey:desc", result: sortedBy((row) => row.publicKey, "desc") },
			{
				orderBy: "rank:asc,attributes.validatorRank:desc",
				result: sortedBy((row) => row.attributes.validatorRank),
			},
			{ orderBy: "votes:desc", result: sortedBy((row) => BigInt(row.attributes.validatorVoteBalance), "desc") },
			{ orderBy: "username:asc", result: sortedBy((row) => row.attributes.username) },
			{ orderBy: "blocks.produced:asc", result: sortedBy((row) => row.attributes.validatorProducedBlocks) },
			{
				orderBy: "blocks.last.number:desc",
				result: sortedBy((row) => row.attributes.validatorLastBlock.number, "desc"),
			},
			{ orderBy: "blocks.last.hash:asc", result: sortedBy((row) => row.attributes.validatorLastBlock.hash) },
			{
				orderBy: "forged.fees:desc",
				result: sortedBy((row) => BigInt(row.attributes.validatorForgedFees), "desc"),
			},
			{ orderBy: "forged.rewards:asc", result: sortedBy((row) => BigInt(row.attributes.validatorForgedRewards)) },
			{
				orderBy: "forged.total:desc",
				result: sortedBy((row) => BigInt(row.attributes.validatorForgedTotal), "desc"),
			},
			{
				orderBy: "production.approval:desc",
				result: sortedBy((row) => row.attributes.validatorApproval, "desc"),
			},
			{
				orderBy: "isResigned:desc,rank:asc",
				result: [...rows]
					.sort(
						(a, b) =>
							Number(b.attributes.validatorResigned) - Number(a.attributes.validatorResigned) ||
							a.attributes.validatorRank - b.attributes.validatorRank,
					)
					.map((row) => row.address),
			},
		];

		for (const { orderBy, result } of testCases) {
			const { statusCode, data } = await request(`/validators?orderBy=${orderBy}`, options);
			assert.equal(statusCode, 200);
			assert.equal(
				data.data.map((validator) => validator.address),
				result,
			);
		}
	});

	it("/validators?orderBy counts missing counters as zero", async () => {
		const produced = [2, undefined, 1, 5, undefined, 3, 4, 6];
		const rows = validators.map((validator, index) => {
			const {
				validatorForgedFees,
				validatorForgedRewards,
				validatorForgedTotal,
				validatorProducedBlocks,
				...attributes
			} = validator.attributes;

			return {
				...validator,
				attributes:
					produced[index] === undefined
						? attributes
						: {
								...attributes,
								validatorForgedTotal: `${produced[index]}000000000000000000`,
								validatorProducedBlocks: produced[index],
							},
			};
		});
		await apiContext.walletRepository.save(rows);

		const ascending = [4, 1, 2, 0, 5, 6, 3, 7].map((index) => rows[index].address);

		for (const orderBy of ["blocks.produced:asc,rank:asc", "forged.total:asc,rank:asc"]) {
			const { statusCode, data } = await request(`/validators?orderBy=${orderBy}`, options);
			assert.equal(statusCode, 200);
			assert.equal(
				data.data.map((validator) => validator.address),
				ascending,
			);
		}
	});

	it("/validators numeric filters", async () => {
		const votes = ["900", "10000", "5", "80", "7000", "60", "3", "400"].map(
			(value) => `${value}000000000000000000`,
		);
		const approvals = [1.5, 0.25, 10.75, 3, 0.5, 2.25, 7, 0.125];
		const rows = validators.map((validator, index) => {
			const { validatorProducedBlocks, ...attributes } = validator.attributes;

			return {
				...validator,
				attributes: {
					...attributes,
					...(index % 3 === 0 ? {} : { validatorProducedBlocks: index }),
					validatorApproval: approvals[index],
					validatorVoteBalance: votes[index],
				},
			};
		});
		await apiContext.walletRepository.save(rows);

		const testCases = [
			{ path: "rank.from=5&rank.to=13", result: [0, 2, 5] },
			{ path: "votes.from=1000000000000000000000", result: [1, 4] },
			{ path: "production.approval.from=2", result: [2, 3, 5, 6] },
			{ path: "blocks.produced.to=0", result: [0, 3, 6] },
			{ path: "attributes.validatorProducedBlocks.to=0", result: [0, 3, 6] },
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(`/validators?${path}`, options);
			assert.equal(statusCode, 200);
			assert.equal(
				data.data.map((validator) => validator.address).sort(),
				result.map((index) => rows[index].address).sort(),
			);
		}
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

	it("/validators?username", async () => {
		await apiContext.walletRepository.save(validators);

		const { statusCode, data } = await request("/validators?username=genesis_5", options);
		assert.equal(statusCode, 200);
		assert.equal(
			data.data.map((validator) => validator.address),
			[validators[2].address],
		);
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
