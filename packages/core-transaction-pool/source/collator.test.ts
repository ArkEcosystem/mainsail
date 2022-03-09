import { Container } from "@arkecosystem/core-kernel";
import { Managers } from "@arkecosystem/crypto";
import { describe } from "@arkecosystem/core-test-framework";
import { Collator } from "./";

describe<{
	container: Container.Container;
	validator: any;
	createTransactionValidator: any;
	blockchain: any;
	pool: any;
	expirationService: any;
	poolQuery: any;
	logger: any;
}>("Collator", ({ it, assert, beforeAll, beforeEach, afterEach, stubFn, stub, spy }) => {
	beforeAll((context) => {
		context.validator = { validate: () => undefined };
		context.createTransactionValidator = stubFn();
		context.blockchain = { getLastBlock: () => undefined };
		context.pool = { removeTransaction: () => undefined };
		context.expirationService = { isExpired: () => undefined };
		context.poolQuery = { getFromHighestPriority: () => undefined };
		context.logger = { warning: () => undefined, error: () => undefined };

		context.container = new Container.Container();
		context.container
			.bind(Container.Identifiers.TransactionValidatorFactory)
			.toConstantValue(context.createTransactionValidator);
		context.container.bind(Container.Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Container.Identifiers.TransactionPoolService).toConstantValue(context.pool);
		context.container.bind(Container.Identifiers.TransactionPoolQuery).toConstantValue(context.poolQuery);
		context.container
			.bind(Container.Identifiers.TransactionPoolExpirationService)
			.toConstantValue(context.expirationService);
		context.container.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
	});

	beforeEach((context) => {
		context.createTransactionValidator.returns(context.validator);
	});

	afterEach((context) => {
		context.createTransactionValidator.reset();
	});

	it("getBlockCandidateTransactions - should respect block.maxTransactions milestone limit", async (context) => {
		const poolTransactions = [
			{ data: { senderPublicKey: "0" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "1" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "2" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "3" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "4" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "5" }, serialized: Buffer.alloc(10) },
		];

		const milestone = { block: { idFullSha256: true, maxTransactions: 5, maxPayload: 2097152 } };
		const lastBlock = { data: { height: 10 } };

		const milestoneStub = stub(Managers.configManager, "getMilestone").returnValueOnce(milestone);
		stub(context.blockchain, "getLastBlock").returnValueOnce(lastBlock);
		stub(context.poolQuery, "getFromHighestPriority").returnValueOnce(poolTransactions);
		stub(context.expirationService, "isExpired").resolvedValue(false);

		const validatorSpy = spy(context.validator, "validate");

		const collator = context.container.resolve(Collator);
		const candidateTransaction = await collator.getBlockCandidateTransactions();

		assert.length(candidateTransaction, 5);
		milestoneStub.called();
		assert.true(context.createTransactionValidator.called);
		validatorSpy.calledTimes(5);
	});

	it("getBlockCandidateTransactions - should respect block.maxPayload milestone limit", async (context) => {
		const poolTransactions = [
			{ data: { senderPublicKey: "0" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "1" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "2" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "3" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "4" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "5" }, serialized: Buffer.alloc(10) },
		];

		const milestone = { block: { idFullSha256: true, maxTransactions: 5, maxPayload: 141 + 10 + 4 + 10 + 4 } };
		const lastBlock = { data: { height: 10 } };

		const milestoneStub = stub(Managers.configManager, "getMilestone").returnValueOnce(milestone);
		stub(context.blockchain, "getLastBlock").returnValueOnce(lastBlock);
		stub(context.poolQuery, "getFromHighestPriority").returnValueOnce(poolTransactions);
		stub(context.expirationService, "isExpired").resolvedValue(false);

		const validatorSpy = spy(context.validator, "validate");

		const collator = context.container.resolve(Collator);
		const candidateTransaction = await collator.getBlockCandidateTransactions();

		assert.length(candidateTransaction, 2);
		milestoneStub.called();
		assert.true(context.createTransactionValidator.called);
		validatorSpy.calledTimes(2);
	});

	it("getBlockCandidateTransactions - should ignore future sender transactions if one of them expired", async (context) => {
		const poolTransactions = [
			{ data: { senderPublicKey: "0" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "0" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "2" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "3" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "4" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "5" }, serialized: Buffer.alloc(10) },
		];

		const milestone = { block: { idFullSha256: true, maxTransactions: 5, maxPayload: 2097152 } };
		const lastBlock = { data: { height: 10 } };

		const milestoneStub = stub(Managers.configManager, "getMilestone").returnValueOnce(milestone);
		stub(context.blockchain, "getLastBlock").returnValueOnce(lastBlock);
		stub(context.poolQuery, "getFromHighestPriority").returnValueOnce(poolTransactions);

		const expiredStub = stub(context.expirationService, "isExpired");

		expiredStub.resolvedValueNth(0, true);
		expiredStub.resolvedValueNth(1, false);

		const validatorSpy = spy(context.validator, "validate");
		const loggerSpy = spy(context.logger, "warning");

		const collator = context.container.resolve(Collator);
		const candidateTransaction = await collator.getBlockCandidateTransactions();

		assert.length(candidateTransaction, 4);
		milestoneStub.called();
		assert.true(context.createTransactionValidator.called);
		validatorSpy.calledTimes(4);
		loggerSpy.calledOnce();
	});

	it("getBlockCandidateTransactions - should ignore future sender transactions if one of them failed", async (context) => {
		const poolTransactions = [
			{ data: { senderPublicKey: "0" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "0" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "2" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "3" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "4" }, serialized: Buffer.alloc(10) },
			{ data: { senderPublicKey: "5" }, serialized: Buffer.alloc(10) },
		];

		const milestone = { block: { idFullSha256: true, maxTransactions: 5, maxPayload: 2097152 } };
		const lastBlock = { data: { height: 10 } };

		const milestoneStub = stub(Managers.configManager, "getMilestone").returnValueOnce(milestone);
		stub(context.blockchain, "getLastBlock").returnValueOnce(lastBlock);
		stub(context.poolQuery, "getFromHighestPriority").returnValueOnce(poolTransactions);
		stub(context.expirationService, "isExpired").resolvedValue(false);

		const validatorStub = stub(context.validator, "validate").rejectedValueNth(0, new Error("Some error"));
		const loggerSpy = spy(context.logger, "warning");

		const collator = context.container.resolve(Collator);
		const candidateTransaction = await collator.getBlockCandidateTransactions();

		assert.length(candidateTransaction, 4);
		milestoneStub.called();
		assert.true(context.createTransactionValidator.called);
		validatorStub.calledTimes(5);
		loggerSpy.calledOnce();
	});
});
