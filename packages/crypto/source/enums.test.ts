import { TransactionType } from "./enums";
import { describe } from "@arkecosystem/core-test-framework";

describe("Constants", ({ it, assert }) => {
	it("transaction types are defined", () => {
		assert.defined(TransactionType);

		assert.defined(TransactionType.Transfer);
		assert.equal(TransactionType.Transfer, 0);

		assert.defined(TransactionType.DelegateRegistration);
		assert.equal(TransactionType.DelegateRegistration, 2);

		assert.defined(TransactionType.Vote);
		assert.equal(TransactionType.Vote, 3);

		assert.defined(TransactionType.MultiSignature);
		assert.equal(TransactionType.MultiSignature, 4);

		assert.defined(TransactionType.MultiPayment);
		assert.equal(TransactionType.MultiPayment, 6);

		assert.defined(TransactionType.DelegateResignation);
		assert.equal(TransactionType.DelegateResignation, 7);
	});
});
