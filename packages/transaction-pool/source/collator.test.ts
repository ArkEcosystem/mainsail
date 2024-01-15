import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";

import crypto from "../../core/bin/config/testnet/mainsail/crypto.json";
import { describe } from "../../test-framework";
import { Collator } from ".";

describe<{
	container: Container;
	config: Configuration;
	validator: any;
	createTransactionValidator: any;
	stateStore: any;
	stateService: any;
	pool: any;
	expirationService: any;
	poolQuery: any;
	logger: any;
	blockSerializer: any;
}>("Collator", ({ it, assert, beforeAll, stub, spy }) => {
	beforeAll((context) => {
		context.validator = { validate: () => {} };
		context.createTransactionValidator = () => context.validator;
		context.stateStore = { getLastBlock: () => {} };
		context.stateService = { getStateStore: () => context.stateStore };
		context.pool = { removeTransaction: () => {} };
		context.expirationService = { isExpired: () => {} };
		context.poolQuery = {
			getFromHighestPriority: () => {
				() => {};
			},
		};
		context.logger = { error: () => {}, warning: () => {} };

		context.blockSerializer = {
			headerSize: () => 152,
		};

		context.container = new Container();
		context.container.bind(Identifiers.Cryptography.Block.Serializer).toConstantValue(context.blockSerializer);
		context.container
			.bind(Identifiers.TransactionPool.TransactionValidator.Factory)
			.toConstantValue(context.createTransactionValidator);
		context.container.bind(Identifiers.State.Service).toConstantValue(context.stateService);
		context.container.bind(Identifiers.TransactionPool.Service).toConstantValue(context.pool);
		context.container.bind(Identifiers.TransactionPool.Query).toConstantValue(context.poolQuery);
		context.container
			.bind(Identifiers.TransactionPool.ExpirationService)
			.toConstantValue(context.expirationService);
		context.container.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.container.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(crypto);

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
		stub(context.stateStore, "getLastBlock").returnValueOnce(lastBlock);
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

		const milestone = { block: { idFullSha256: true, maxPayload: 152 + (10 + 4) * 2, maxTransactions: 5 } };
		const lastBlock = { data: { height: 10 } };

		const milestoneStub = stub(context.config, "getMilestone").returnValueOnce(milestone);
		stub(context.stateStore, "getLastBlock").returnValueOnce(lastBlock);
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
		stub(context.stateStore, "getLastBlock").returnValueOnce(lastBlock);
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
		stub(context.stateStore, "getLastBlock").returnValueOnce(lastBlock);
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
