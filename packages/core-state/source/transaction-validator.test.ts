import { Utils } from "@arkecosystem/core-kernel";
import { TransactionValidator } from "./transaction-validator";
import { AssertionError } from "assert";
import { makeVoteTransactions } from "../test/make-vote-transactions";
import { setUp } from "../test/setup";
import { SinonSpy } from "sinon";
import { describeSkip } from "../../core-test-framework";

describeSkip<{
	transactionValidator: TransactionValidator;
	applySpy: SinonSpy;
}>("Transaction Validator", ({ it, beforeAll, afterEach, assert }) => {
	beforeAll(async (context) => {
		const env = await setUp();

		context.transactionValidator = env.transactionValidator;
		context.applySpy = env.spies.applySpy;
	});

	afterEach((context) => {
		context.applySpy.resetHistory();
	});

	it("should validate transactions", async (context) => {
		const transaction = makeVoteTransactions(1, [
			`+${"03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37"}`,
		]);

		await context.transactionValidator.validate(transaction[0]);

		assert.true(context.applySpy.calledWith(transaction[0]));
	});

	it("should throw when transaction id doesn't match deserialised", (context) => {
		const transaction = makeVoteTransactions(1, [
			`+${"03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37"}`,
		]);
		const copiedTransaction = Utils.cloneObject(transaction[0]) as any;
		copiedTransaction.id = "wrong";

		context.transactionValidator.validate(copiedTransaction).catch((e) => assert.instance(e, AssertionError));
	});
});
