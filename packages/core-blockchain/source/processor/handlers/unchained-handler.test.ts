import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { Utils } from "@arkecosystem/core-kernel";

import { describe, Sandbox } from "../../../../core-test-framework";
import { BlockProcessorResult } from "../contracts";
import { UnchainedHandler } from "./unchained-handler";

describe<{
	sandbox: Sandbox;
	logger: any;
	blockchain: any;
	stateStore: any;
	database: any;
	databaseInteractions: any;
	roundState: any;
	triggers: {};
}>("UnchainedHandler", ({ assert, beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.logger = {
			debug: () => {},
			info: () => {},
			warning: () => {},
		};
		context.blockchain = {
			clearQueue: () => {},
			getLastBlock: () => {},
			getQueue: () => ({ size: () => {} }),
			resetLastDownloadedBlock: () => {},
		};
		context.stateStore = {
			getNumberOfBlocksToRollback: () => 0,
			setNumberOfBlocksToRollback: () => {},
		};
		context.database = {};
		context.databaseInteractions = {
			deleteRound: () => {},
			getLastBlock: () => {},
			getTopBlocks: () => {},
			loadBlocksFromCurrentRound: () => {},
			revertBlock: () => {},
			walletRepository: {
				getNonce: () => {},
			},
		};

		context.roundState = {
			getActiveDelegates: () => [],
		};

		context.triggers = {
			call: () => {},
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue(context.stateStore);
		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(context.logger);
		context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue(context.database);
		context.sandbox.app.bind(Identifiers.DatabaseInteraction).toConstantValue(context.databaseInteractions);
		context.sandbox.app.bind(Identifiers.RoundState).toConstantValue(context.roundState);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.sandbox.app.bind(Identifiers.TriggerService).toConstantValue(context.triggers);
	});

	it("when it is a double forging case should return Rollback if block generator is active delegate", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);
		unchainedHandler.initialize(true);

		const lastBlock = { data: { height: 443, id: "123", timestamp: 111_112 } };
		const block = {
			data: {
				generatorPublicKey: "03ea97a59522c4cb4bb3420fc94555f6223813d9817dd421bf533b390a7ea140db",
				height: 443,
				id: "987",
				timestamp: 111_122,
			},
		};

		stub(Utils.roundCalculator, "calculateRound").returnValue({});
		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);
		stub(context.triggers, "call").resolvedValue(
			[
				block.data.generatorPublicKey,
				"02aea83a44f1d6b073e5bcffb4176bbe3c51dcd0e96a793a88f3a6135600224adf",
				"03a3c6fd74a23fbe1e02f08d9c626ebb255b48de7ba8c283ee27c9303be81a2933",
			].map((publicKey) => ({
				getPublicKey: () => publicKey,
			})),
		);

		const result = await unchainedHandler.execute(block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.Rollback);
	});

	it("when it is a double forging case should return Rejected if block generator is not an active delegate", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);
		unchainedHandler.initialize(true);

		const lastBlock = { data: { height: 443, id: "123", timestamp: 111_112 } };
		const block = {
			data: {
				generatorPublicKey: "03ea97a59522c4cb4bb3420fc94555f6223813d9817dd421bf533b390a7ea140db",
				height: 443,
				id: "987",
				timestamp: 111_122,
			},
		};

		stub(Utils.roundCalculator, "calculateRound").returnValue({});
		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);
		stub(context.triggers, "call").resolvedValue(
			[
				"02aea83a44f1d6b073e5bcffb4176bbe3c51dcd0e96a793a88f3a6135600224adf",
				"03a3c6fd74a23fbe1e02f08d9c626ebb255b48de7ba8c283ee27c9303be81a2933",
			].map((publicKey) => ({
				getPublicKey: () => publicKey,
			})),
		);

		const result = await unchainedHandler.execute(block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
	});

	it("when it is a NotReadyToAcceptNewHeight case should return Rejected when height > lastBlock height +1", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);
		unchainedHandler.initialize(true);

		const lastBlock = { data: { height: 443, id: "123", timestamp: 111_112 } };
		const block = {
			data: {
				generatorPublicKey: "03ea97a59522c4cb4bb3420fc94555f6223813d9817dd421bf533b390a7ea140db",
				height: lastBlock.data.height + 2,
				id: "987",
				timestamp: 111_122,
			},
		};

		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);
		stub(context.blockchain, "getQueue").returnValue({ size: () => 1 });

		const result = await unchainedHandler.execute(block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
	});

	it("when block is already in blockchain (height < last height) should return DiscardedButCanBeBroadcasted", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);

		const lastBlock = { data: { height: 443, id: "123", timestamp: 111_112 } };
		const block = {
			data: {
				generatorPublicKey: "03ea97a59522c4cb4bb3420fc94555f6223813d9817dd421bf533b390a7ea140db",
				height: 442,
				id: "987",
				timestamp: 111_102,
			},
		};

		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);

		const result = await unchainedHandler.execute(block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.DiscardedButCanBeBroadcasted);
	});

	it("when it is a GeneratorMismatch case should return Rejected", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);

		const lastBlock = { data: { height: 443, id: "123", timestamp: 111_112 } };
		const block = {
			data: {
				generatorPublicKey: "03ea97a59522c4cb4bb3420fc94555f6223813d9817dd421bf533b390a7ea140db",
				height: 443,
				id: "987",
				timestamp: 111_122,
			},
		};
		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);

		const result = await unchainedHandler.execute(block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
	});

	it("when it is a InvalidTimestamp case should return Rejected", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);

		const lastBlock = { data: { height: 443, id: "123", timestamp: 111_112 } };
		const block = {
			data: {
				generatorPublicKey: "03ea97a59522c4cb4bb3420fc94555f6223813d9817dd421bf533b390a7ea140db",
				height: lastBlock.data.height + 1,
				id: "987",
				timestamp: lastBlock.data.timestamp - 20,
			},
		};
		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);

		const result = await unchainedHandler.execute(block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
	});

	it("when it is a InvalidTimestamp case should return DiscardedButCanBeBroadcasted when does not match above cases", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);

		const lastBlock = { data: { height: 443, id: "123", timestamp: 111_112 } };
		const block = lastBlock;

		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);
		const result = await unchainedHandler.execute(block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.DiscardedButCanBeBroadcasted);
	});
});
