import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";

import { describe } from "../../core-test-framework";
import { Collator } from ".";

describe<{
	container: Container;
	config: Configuration;
	validator: any;
	createTransactionValidator: any;
	blockchain: any;
	pool: any;
	expirationService: any;
	poolQuery: any;
	logger: any;
}>("Collator", ({ it, assert, beforeAll, stub, spy }) => {
	beforeAll((context) => {
		context.validator = { validate: () => {} };
		context.createTransactionValidator = () => context.validator;
		context.blockchain = { getLastBlock: () => {} };
		context.pool = { removeTransaction: () => {} };
		context.expirationService = { isExpired: () => {} };
		context.poolQuery = {
			getFromHighestPriority: () => {
				() => {};
			},
		};
		context.logger = { error: () => {}, warning: () => {} };

		context.container = new Container();
		context.container
			.bind(Identifiers.TransactionValidatorFactory)
			.toConstantValue(context.createTransactionValidator);
		context.container.bind(Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Identifiers.TransactionPoolService).toConstantValue(context.pool);
		context.container.bind(Identifiers.TransactionPoolQuery).toConstantValue(context.poolQuery);
		context.container.bind(Identifiers.TransactionPoolExpirationService).toConstantValue(context.expirationService);
		context.container.bind(Identifiers.LogService).toConstantValue(context.logger);
		context.container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.config = context.container.get(Identifiers.Cryptography.Configuration);
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

		const milestone = { block: { idFullSha256: true, maxPayload: 2_097_152, maxTransactions: 5 } };
		const lastBlock = { data: { height: 10 } };

		const milestoneStub = stub(context.config, "getMilestone").returnValueOnce(milestone);
		stub(context.blockchain, "getLastBlock").returnValueOnce(lastBlock);
		stub(context.poolQuery, "getFromHighestPriority").returnValue({ all: () => poolTransactions });
		stub(context.expirationService, "isExpired").resolvedValue(false);

		const validatorSpy = spy(context.validator, "validate");

		const collator = context.container.resolve(Collator);
		const candidateTransaction = await collator.getBlockCandidateTransactions();

		assert.length(candidateTransaction, 5);
		milestoneStub.called();
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

		const milestone = { block: { idFullSha256: true, maxPayload: 141 + 10 + 4 + 10 + 7, maxTransactions: 5 } };
		const lastBlock = { data: { height: 10 } };

		const milestoneStub = stub(context.config, "getMilestone").returnValueOnce(milestone);
		stub(context.blockchain, "getLastBlock").returnValueOnce(lastBlock);
		stub(context.poolQuery, "getFromHighestPriority").returnValueOnce({ all: () => poolTransactions });
		stub(context.expirationService, "isExpired").resolvedValue(false);

		const validatorSpy = spy(context.validator, "validate");

		const collator = context.container.resolve(Collator);
		const candidateTransaction = await collator.getBlockCandidateTransactions();

		assert.length(candidateTransaction, 2);
		milestoneStub.called();
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

		const milestone = { block: { idFullSha256: true, maxPayload: 2_097_152, maxTransactions: 5 } };
		const lastBlock = { data: { height: 10 } };

		const milestoneStub = stub(context.config, "getMilestone").returnValueOnce(milestone);
		stub(context.blockchain, "getLastBlock").returnValueOnce(lastBlock);
		stub(context.poolQuery, "getFromHighestPriority").returnValueOnce({ all: () => poolTransactions });

		const expiredStub = stub(context.expirationService, "isExpired");

		expiredStub.resolvedValueNth(0, true);
		expiredStub.resolvedValueNth(1, false);

		const validatorSpy = spy(context.validator, "validate");
		const loggerSpy = spy(context.logger, "warning");

		const collator = context.container.resolve(Collator);
		const candidateTransaction = await collator.getBlockCandidateTransactions();

		assert.length(candidateTransaction, 4);
		milestoneStub.called();
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

		const milestone = { block: { idFullSha256: true, maxPayload: 2_097_152, maxTransactions: 5 } };
		const lastBlock = { data: { height: 10 } };

		const milestoneStub = stub(context.config, "getMilestone").returnValueOnce(milestone);
		stub(context.blockchain, "getLastBlock").returnValueOnce(lastBlock);
		stub(context.poolQuery, "getFromHighestPriority").returnValueOnce({ all: () => poolTransactions });
		stub(context.expirationService, "isExpired").resolvedValue(false);

		const validatorStub = stub(context.validator, "validate").rejectedValueNth(0, new Error("Some error"));
		const loggerSpy = spy(context.logger, "warning");

		const collator = context.container.resolve(Collator);
		const candidateTransaction = await collator.getBlockCandidateTransactions();

		assert.length(candidateTransaction, 4);
		milestoneStub.called();
		validatorStub.calledTimes(5);
		loggerSpy.calledOnce();
	});
});
