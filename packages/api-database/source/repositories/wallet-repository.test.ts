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
});
