import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";

import crypto from "../../../core/bin/config/testnet/core/crypto.json";
import { describe } from "../../../test-framework/source";
import { GetTransactionsAction } from ".";

describe<{
	container: Container;
	config: Configuration;
	createTransactionValidator: any;
	store: any;
	stateService: any;
	pool: any;
	expirationService: any;
	poolQuery: any;
	logger: any;
	blockSerializer: any;
}>("GetTransactionsAction", ({ it, assert, beforeAll, stub, spy }) => {
	beforeAll((context) => {
		context.store = { getLastBlock: () => {} };
		context.stateService = { getStore: () => context.store };
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
		stub(context.store, "getLastBlock").returnValueOnce(lastBlock);
		stub(context.poolQuery, "getFromHighestPriority").returnValue({ all: () => poolTransactions });
		stub(context.expirationService, "isExpired").resolvedValue(false);

		const action = context.container.resolve(GetTransactionsAction);
		const candidateTransaction = await action.handle({});

		assert.length(candidateTransaction, 5);
		milestoneStub.called();
	});

	// TODO: Fix this test
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
		stub(context.store, "getLastBlock").returnValueOnce(lastBlock);
		stub(context.poolQuery, "getFromHighestPriority").returnValueOnce({ all: () => poolTransactions });
		stub(context.expirationService, "isExpired").resolvedValue(false);

		const action = context.container.resolve(GetTransactionsAction);
		const candidateTransaction = await action.handle({});

		assert.length(candidateTransaction, 2);
		milestoneStub.called();
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
		stub(context.store, "getLastBlock").returnValueOnce(lastBlock);
		stub(context.poolQuery, "getFromHighestPriority").returnValueOnce({ all: () => poolTransactions });

		const expiredStub = stub(context.expirationService, "isExpired");

		expiredStub.resolvedValueNth(0, true);
		expiredStub.resolvedValueNth(1, false);

		const loggerSpy = spy(context.logger, "warning");

		const action = context.container.resolve(GetTransactionsAction);
		const candidateTransaction = await action.handle({});

		assert.length(candidateTransaction, 4);
		milestoneStub.called();
		loggerSpy.calledOnce();
	});
});
