import { Container, Services } from "@arkecosystem/core-kernel";
import { Actions } from "@arkecosystem/core-state";
import { Interfaces } from "@arkecosystem/crypto";
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
}>("UnchainedHandler", ({ assert, beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.logger = {
			warning: () => undefined,
			debug: () => undefined,
			info: () => undefined,
		};
		context.blockchain = {
			resetLastDownloadedBlock: () => undefined,
			clearQueue: () => undefined,
			getLastBlock: () => undefined,
			getQueue: () => ({ size: () => undefined }),
		};
		context.stateStore = {
			getNumberOfBlocksToRollback: () => 0,
			setNumberOfBlocksToRollback: () => undefined,
		};
		context.database = {};
		context.databaseInteractions = {
			walletRepository: {
				getNonce: () => undefined,
			},
			getTopBlocks: () => undefined,
			getLastBlock: () => undefined,
			loadBlocksFromCurrentRound: () => undefined,
			revertBlock: () => undefined,
			deleteRound: () => undefined,
		};

		context.roundState = {
			getActiveDelegates: () => [],
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);
		context.sandbox.app.bind(Container.Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.sandbox.app.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
		context.sandbox.app.bind(Container.Identifiers.DatabaseService).toConstantValue(context.database);
		context.sandbox.app
			.bind(Container.Identifiers.DatabaseInteraction)
			.toConstantValue(context.databaseInteractions);
		context.sandbox.app.bind(Container.Identifiers.RoundState).toConstantValue(context.roundState);

		context.sandbox.app
			.bind(Container.Identifiers.TriggerService)
			.to(Services.Triggers.Triggers)
			.inSingletonScope();
		context.sandbox.app
			.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService)
			.bind("getActiveDelegates", new Actions.GetActiveDelegatesAction(context.sandbox.app));
	});

	it("when it is a double forging case should return Rollback if block generator is active delegate", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);
		unchainedHandler.initialize(true);

		const lastBlock = { data: { id: "123", height: 443, timestamp: 111112 } };
		const block = {
			data: {
				id: "987",
				height: 443,
				timestamp: 111122,
				generatorPublicKey: "03ea97a59522c4cb4bb3420fc94555f6223813d9817dd421bf533b390a7ea140db",
			},
		};

		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);
		stub(context.roundState, "getActiveDelegates").returnValue(
			[
				block.data.generatorPublicKey,
				"02aea83a44f1d6b073e5bcffb4176bbe3c51dcd0e96a793a88f3a6135600224adf",
				"03a3c6fd74a23fbe1e02f08d9c626ebb255b48de7ba8c283ee27c9303be81a2933",
			].map((publicKey) => ({
				getPublicKey: () => {
					return publicKey;
				},
			})),
		);

		const result = await unchainedHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Rollback);
	});

	it("when it is a double forging case should return Rejected if block generator is not an active delegate", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);
		unchainedHandler.initialize(true);

		const lastBlock = { data: { id: "123", height: 443, timestamp: 111112 } };
		const block = {
			data: {
				id: "987",
				height: 443,
				timestamp: 111122,
				generatorPublicKey: "03ea97a59522c4cb4bb3420fc94555f6223813d9817dd421bf533b390a7ea140db",
			},
		};

		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);
		stub(context.roundState, "getActiveDelegates").returnValue(
			[
				"02aea83a44f1d6b073e5bcffb4176bbe3c51dcd0e96a793a88f3a6135600224adf",
				"03a3c6fd74a23fbe1e02f08d9c626ebb255b48de7ba8c283ee27c9303be81a2933",
			].map((publicKey) => ({
				getPublicKey: () => {
					return publicKey;
				},
			})),
		);

		const result = await unchainedHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
	});

	it("when it is a NotReadyToAcceptNewHeight case should return Rejected when height > lastBlock height +1", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);
		unchainedHandler.initialize(true);

		const lastBlock = { data: { id: "123", height: 443, timestamp: 111112 } };
		const block = {
			data: {
				id: "987",
				height: lastBlock.data.height + 2,
				timestamp: 111122,
				generatorPublicKey: "03ea97a59522c4cb4bb3420fc94555f6223813d9817dd421bf533b390a7ea140db",
			},
		};

		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);
		stub(context.blockchain, "getQueue").returnValue({ size: () => 1 });

		const result = await unchainedHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
	});

	it("when block is already in blockchain (height < last height) should return DiscardedButCanBeBroadcasted", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);

		const lastBlock = { data: { id: "123", height: 443, timestamp: 111112 } };
		const block = {
			data: {
				id: "987",
				height: 442,
				timestamp: 111102,
				generatorPublicKey: "03ea97a59522c4cb4bb3420fc94555f6223813d9817dd421bf533b390a7ea140db",
			},
		};

		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);

		const result = await unchainedHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.DiscardedButCanBeBroadcasted);
	});

	it("when it is a GeneratorMismatch case should return Rejected", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);

		const lastBlock = { data: { id: "123", height: 443, timestamp: 111112 } };
		const block = {
			data: {
				id: "987",
				height: 443,
				timestamp: 111122,
				generatorPublicKey: "03ea97a59522c4cb4bb3420fc94555f6223813d9817dd421bf533b390a7ea140db",
			},
		};
		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);

		const result = await unchainedHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
	});

	it("when it is a InvalidTimestamp case should return Rejected", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);

		const lastBlock = { data: { id: "123", height: 443, timestamp: 111112 } };
		const block = {
			data: {
				id: "987",
				height: lastBlock.data.height + 1,
				timestamp: lastBlock.data.timestamp - 20,
				generatorPublicKey: "03ea97a59522c4cb4bb3420fc94555f6223813d9817dd421bf533b390a7ea140db",
			},
		};
		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);

		const result = await unchainedHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
	});

	it("when it is a InvalidTimestamp case should return DiscardedButCanBeBroadcasted when does not match above cases", async (context) => {
		const unchainedHandler = context.sandbox.app.resolve<UnchainedHandler>(UnchainedHandler);

		const lastBlock = { data: { id: "123", height: 443, timestamp: 111112 } };
		const block = lastBlock;

		stub(context.blockchain, "getLastBlock").returnValue(lastBlock);
		const result = await unchainedHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.DiscardedButCanBeBroadcasted);
	});
});
