import { describe } from "@mainsail/test-runner";

import { makeWalletRepository } from "./wallet-repository";

const pagination = { limit: 100, offset: 0 };

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
		]);
	});

	it("should sort wallet columns as columns", async ({ repository }) => {
		for (const property of ["address", "balance", "nonce", "publicKey"]) {
			assert.equal(await repository.findManyByCriteria({}, [{ direction: "asc", property }], pagination), [
				{ direction: "asc", property },
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
		]);
	});

	it("should sort validators by rank by default", async ({ repository }) => {
		assert.equal(await repository.findManyValidatorsByCritera({}, [], pagination), [
			{
				direction: "asc",
				jsonFieldAccessor: { cast: "bigint", fieldName: "validatorRank", operator: "->>" },
				property: "attributes",
			},
		]);
	});

	it("should sort validator names by the attributes they are stored as", async ({ repository }) => {
		for (const [property, fieldName, cast] of [
			["blocks.last.hash", "validatorLastBlock.hash", undefined],
			["blocks.last.number", "validatorLastBlock.number", "bigint"],
			["blocks.produced", "validatorProducedBlocks", "bigint"],
			["forged.fees", "validatorForgedFees", "numeric"],
			["forged.rewards", "validatorForgedRewards", "numeric"],
			["forged.total", "validatorForgedTotal", "numeric"],
			["isResigned", "validatorResigned", undefined],
			["production.approval", "validatorApproval", "numeric"],
			["rank", "validatorRank", "bigint"],
			["username", "username", undefined],
			["votes", "validatorVoteBalance", "numeric"],
		]) {
			assert.equal(
				await repository.findManyValidatorsByCritera({}, [{ direction: "desc", property }], pagination),
				[
					{
						direction: "desc",
						jsonFieldAccessor: { cast, fieldName, operator: "->>" },
						property: "attributes",
					},
				],
			);
		}
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
			],
		);
	});
});
