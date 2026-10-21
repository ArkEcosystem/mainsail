import { describe } from "@mainsail/test-runner";

import { makeWalletRepository } from "./wallet-repository";

const pagination = { limit: 100, offset: 0 };

// Ties are broken on the address, in the direction of the last sort key.
const byAddress = (direction: string) => ({ direction, property: "address" });

describe<{
	repository: any;
}>("WalletRepository", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		const base = {
			extend(object: any) {
				return Object.assign(this, object);
			},
		};

		context.repository = makeWalletRepository({ getRepository: () => base } as any);
		// Return the sorting handed to the query so the tests can assert on it.
		context.repository.listByExpression = async (_expression, sorting) => sorting;
	});

	it("should sort wallets by balance by default", async ({ repository }) => {
		assert.equal(await repository.findManyByCriteria({}, [], pagination), [
			{ direction: "desc", property: "balance" },
			byAddress("desc"),
		]);
	});

	it("should sort wallet columns as columns", async ({ repository }) => {
		for (const property of ["address", "balance", "nonce", "publicKey"]) {
			assert.equal(await repository.findManyByCriteria({}, [{ direction: "asc", property }], pagination), [
				{ direction: "asc", property },
				...(property === "address" ? [] : [byAddress("asc")]),
			]);
		}
	});

	it("should sort attributes by their inferred type", async ({ repository }) => {
		const sorting = [
			{ direction: "desc", property: "attributes.validatorVoteBalance" },
			{ direction: "asc", property: "attributes.validatorLastBlock.number" },
			{ direction: "asc", property: "attributes.username" },
		];

		assert.equal(await repository.findManyByCriteria({}, sorting, pagination), [
			{
				direction: "desc",
				jsonFieldAccessor: { cast: "numeric", fieldName: "validatorVoteBalance", operator: "->>" },
				property: "attributes",
			},
			{
				direction: "asc",
				jsonFieldAccessor: { cast: "bigint", fieldName: "validatorLastBlock.number", operator: "->>" },
				property: "attributes",
			},
			{
				direction: "asc",
				jsonFieldAccessor: { cast: undefined, fieldName: "username", operator: "->>" },
				property: "attributes",
			},
			byAddress("asc"),
		]);
	});

	it("should sort validators by rank by default", async ({ repository }) => {
		assert.equal(await repository.findManyValidatorsByCritera({}, [], pagination), [
			{
				direction: "asc",
				jsonFieldAccessor: { cast: "bigint", fieldName: "validatorRank", operator: "->>" },
				property: "attributes",
			},
			byAddress("asc"),
		]);
	});

	it("should sort validator names by the attributes they are stored as", async ({ repository }) => {
		for (const [property, jsonFieldAccessor] of [
			["blocks.last.hash", { cast: undefined, fieldName: "validatorLastBlock.hash" }],
			["blocks.last.number", { cast: "bigint", fieldName: "validatorLastBlock.number" }],
			["blocks.produced", { cast: "bigint", fallback: "0", fieldName: "validatorProducedBlocks" }],
			["forged.fees", { cast: "numeric", fallback: "0", fieldName: "validatorForgedFees" }],
			["forged.rewards", { cast: "numeric", fallback: "0", fieldName: "validatorForgedRewards" }],
			["forged.total", { cast: "numeric", fallback: "0", fieldName: "validatorForgedTotal" }],
			["isResigned", { cast: undefined, fieldName: "validatorResigned" }],
			["production.approval", { cast: "numeric", fieldName: "validatorApproval" }],
			["rank", { cast: "bigint", fieldName: "validatorRank" }],
			["username", { cast: undefined, fieldName: "username" }],
			["votes", { cast: "numeric", fieldName: "validatorVoteBalance" }],
		] as const) {
			assert.equal(
				await repository.findManyValidatorsByCritera({}, [{ direction: "desc", property }], pagination),
				[
					{
						direction: "desc",
						jsonFieldAccessor: { ...jsonFieldAccessor, operator: "->>" },
						property: "attributes",
					},
					byAddress("desc"),
				],
			);
		}
	});

	it("should count missing counters as zero for validators only", async ({ repository }) => {
		const sorting = [{ direction: "asc", property: "attributes.validatorProducedBlocks" }];
		const jsonFieldAccessor = { cast: "bigint", fieldName: "validatorProducedBlocks", operator: "->>" };

		assert.equal(await repository.findManyByCriteria({}, sorting, pagination), [
			{ direction: "asc", jsonFieldAccessor, property: "attributes" },
			byAddress("asc"),
		]);
		assert.equal(await repository.findManyValidatorsByCritera({}, sorting, pagination), [
			{ direction: "asc", jsonFieldAccessor: { ...jsonFieldAccessor, fallback: "0" }, property: "attributes" },
			byAddress("asc"),
		]);
	});

	it("should not treat inherited object keys as validator names", async ({ repository }) => {
		assert.equal(
			await repository.findManyValidatorsByCritera(
				{},
				[{ direction: "asc", property: "constructor" }],
				pagination,
			),
			[
				{
					direction: "asc",
					jsonFieldAccessor: { cast: undefined, fieldName: "constructor", operator: "->>" },
					property: "attributes",
				},
				byAddress("asc"),
			],
		);
	});
});
