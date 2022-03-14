// import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
// import { Configuration } from "@arkecosystem/core-crypto-config";
// import { Services } from "@arkecosystem/core-kernel";
// import { Actions } from "@arkecosystem/core-state";
// import { BigNumber } from "@arkecosystem/utils";

// import { describe, Sandbox } from "../../../core-test-framework";
// import { BlockProcessor } from "./block-processor";
// import {
// 	AcceptBlockHandler,
// 	AlreadyForgedHandler,
// 	ExceptionHandler,
// 	IncompatibleTransactionsHandler,
// 	InvalidGeneratorHandler,
// 	NonceOutOfOrderHandler,
// 	UnchainedHandler,
// 	VerificationFailedHandler,
// } from "./handlers";

// describe<{
// 	sandbox: Sandbox;
// 	blockProcessor: BlockProcessor;
// 	baseBlock: any;
// 	chainedBlock: any;

// 	// handler spies
// 	acceptBlockHandlerSpy: any;
// 	alreadyForgedHandlerSpy: any;
// 	exceptionHandlerSpy: any;
// 	incompatibleTransactionsHandlerSpy: any;
// 	invalidGeneratorHandlerSpy: any;
// 	nonceOutOfOrderHandlerSpy: any;
// 	unchainedHandlerSpy: any;
// 	verificationFailedHandlerSpy: any;

// 	blockchain: any;
// 	databaseInteractions: any;
// 	databaseInterceptor: any;
// 	databaseService: any;
// 	logService: any;
// 	roundState: any;
// 	stateStore: any;
// 	transactionHandlerRegistry: any;
// 	transactionRepository: any;
// 	walletRepository: any;
// 	blockVerifier: any;
// }>("BlockProcessor", ({ assert, beforeEach, it, spy, stub, stubFn }) => {
// 	beforeEach((context) => {
// 		context.acceptBlockHandlerSpy = spy(AcceptBlockHandler.prototype, "execute");
// 		context.alreadyForgedHandlerSpy = spy(AlreadyForgedHandler.prototype, "execute");
// 		context.exceptionHandlerSpy = spy(ExceptionHandler.prototype, "execute");
// 		context.incompatibleTransactionsHandlerSpy = spy(IncompatibleTransactionsHandler.prototype, "execute");
// 		context.invalidGeneratorHandlerSpy = spy(InvalidGeneratorHandler.prototype, "execute");
// 		context.nonceOutOfOrderHandlerSpy = spy(NonceOutOfOrderHandler.prototype, "execute");
// 		context.unchainedHandlerSpy = spy(UnchainedHandler.prototype, "execute");
// 		context.verificationFailedHandlerSpy = spy(VerificationFailedHandler.prototype, "execute");

// 		context.logService = {
// 			debug: () => {},
// 			error: () => {},
// 			info: () => {},
// 			warning: () => {},
// 		};
// 		context.blockchain = {
// 			clearQueue: () => {},
// 			getLastBlock: () => {},
// 			resetLastDownloadedBlock: () => {},
// 		};
// 		context.transactionRepository = {
// 			getForgedTransactionsIds: () => {},
// 		};

// 		context.walletRepository = {
// 			findByPublicKey: () => {},
// 			getNonce: () => {},
// 		};
// 		context.transactionHandlerRegistry = {
// 			getActivatedHandlerForData: () => {},
// 		};
// 		context.databaseService = {};
// 		context.databaseInteractions = {
// 			applyBlock: () => {},
// 			deleteRound: () => {},
// 			getLastBlock: () => {},
// 			getTopBlocks: () => {},
// 			restoreCurrentRound: () => {},
// 			revertBlock: () => {},
// 			walletRepository: context.walletRepository,
// 		};
// 		context.roundState = {
// 			getActiveDelegates: () => {},
// 		};
// 		context.stateStore = {
// 			getForkedBlock: () => {},
// 			getLastBlock: () => {},
// 			getLastBlocks: () => {},
// 			getLastDownloadedBlock: () => {},
// 			getLastStoredBlockHeight: () => {},
// 			isStarted: () => {},
// 		};

// 		context.blockVerifier = {
// 			verify: () => {
// 				return {
// 					verified: true,
// 					containsMultiSignatures: false,
// 				};
// 			},
// 		};

// 		context.databaseInterceptor = {};

// 		context.sandbox = new Sandbox();

// 		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(context.logService);
// 		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(context.blockchain);
// 		context.sandbox.app
// 			.bind(Identifiers.Database.TransactionStorage)
// 			.toConstantValue(context.transactionRepository);
// 		context.sandbox.app.bind(Identifiers.WalletRepository).toConstantValue(context.walletRepository);
// 		context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue(context.databaseService);
// 		context.sandbox.app.bind(Identifiers.DatabaseInteraction).toConstantValue(context.databaseInteractions);
// 		context.sandbox.app.bind(Identifiers.DatabaseInterceptor).toConstantValue(context.databaseInterceptor);
// 		context.sandbox.app.bind(Identifiers.RoundState).toConstantValue(context.roundState);
// 		context.sandbox.app
// 			.bind(Identifiers.TransactionHandlerRegistry)
// 			.toConstantValue(context.transactionHandlerRegistry);
// 		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue(context.stateStore);
// 		context.sandbox.app.bind(Identifiers.TransactionPoolService).toConstantValue({});
// 		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
// 		context.sandbox.app.bind(Identifiers.Cryptography.Time.Slots).toConstantValue({});
// 		context.sandbox.app.bind(Identifiers.Cryptography.Block.Verifier).toConstantValue(context.blockVerifier);

// 		context.sandbox.app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();
// 		context.sandbox.app
// 			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
// 			.bind("getActiveDelegates", new Actions.GetActiveValidatorsAction(context.sandbox.app));

// 		context.baseBlock = {
// 			data: {
// 				height: 2,
// 				generatorPublicKey: "026c598170201caf0357f202ff14f365a3b09322071e347873869f58d776bfc565",
// 				id: "17882607875259085966",
// 				blockSignature:
// 					"3045022100e7385c6ea42bd950f7f6ab8c8619cf2f66a41d8f8f185b0bc99af032cb25f30d02200b6210176a6cedfdcbe483167fd91c21d740e0e4011d24d679c601fdd46b0de9",
// 				numberOfTransactions: 0,
// 				createdAt: "2018-09-11T16:48:50.550Z",
// 				payloadLength: 0,
// 				payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
// 				previousBlock: "17184958558311101492",
// 				reward: BigNumber.make("0"),
// 				timestamp: 46_583_330,
// 				totalAmount: BigNumber.make("0"),
// 				version: 0,
// 				totalFee: BigNumber.make("0"),
// 			},
// 			getHeader: () => {},
// 			serialized: "",
// 			toJson: () => {},
// 			transactions: [],
// 			verification: { containsMultiSignatures: false, errors: [], verified: true },
// 			verify: () => {},
// 			verifySignature: () => {},
// 		};

// 		context.chainedBlock = {
// 			data: {
// 				height: 3,
// 				generatorPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
// 				id: "7242383292164246617",
// 				blockSignature:
// 					"304402204087bb1d2c82b9178b02b9b3f285de260cdf0778643064fe6c7aef27321d49520220594c57009c1fca543350126d277c6adeb674c00685a464c3e4bf0d634dc37e39",
// 				numberOfTransactions: 0,
// 				createdAt: "2018-09-11T16:48:58.431Z",
// 				payloadLength: 0,
// 				payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
// 				previousBlock: "17882607875259085966",
// 				reward: BigNumber.make("0"),
// 				timestamp: 46_583_338,
// 				totalAmount: BigNumber.make("0"),
// 				version: 0,
// 				totalFee: BigNumber.make("0"),
// 			},
// 			getHeader: () => {},
// 			serialized: "",
// 			toJson: () => {},
// 			transactions: [],
// 			verification: { containsMultiSignatures: false, errors: [], verified: true },
// 			verify: () => {},
// 			verifySignature: () => {},
// 		};

// 		context.blockProcessor = context.sandbox.app.resolve<BlockProcessor>(BlockProcessor);
// 	});

// 	it.only("should execute VerificationFailedHandler when !block.verification.verified", async (context) => {
// 		const block = { ...context.baseBlock, verification: { ...context.baseBlock.verification, verified: false } };

// 		await context.blockProcessor.process(block);

// 		// context.verificationFailedHandlerSpy.calledOnce();
// 	});

// 	it("should execute VerificationFailedHandler when handler.verify() fails on one transaction (containsMultiSignatures)", async (context) => {
// 		const block = {
// 			...context.baseBlock,
// 			transactions: [
// 				{
// 					data: {
// 						amount: BigNumber.make("12500000000000000"),
// 						asset: {},
// 						fee: BigNumber.ZERO,
// 						id: "3e3817fd0c35bc36674f3874c2953fa3e35877cbcdb44a08bdc6083dbd39d572",
// 						recipientId: "D6Z26L69gdk9qYmTv5uzk3uGepigtHY4ax",
// 						senderPublicKey: "0208e6835a8f020cfad439c059b89addc1ce21f8cab0af6e6957e22d3720bff8a4",
// 						signature:
// 							"304402203a3f0f80aad4e0561ae975f241f72a074245f1205d676d290d6e5630ed4c027502207b31fee68e64007c380a4b6baccd4db9b496daef5f7894676586e1347ac30a3b",
// 						type: 0,
// 						timestamp: 0,
// 						typeGroup: 1,
// 						version: 1,
// 					},
// 				} as Contracts.Crypto.ITransaction,
// 			],
// 			verification: { containsMultiSignatures: true, errors: [], verified: true },
// 			verify: () => true,
// 		};

// 		stub(context.transactionHandlerRegistry, "getActivatedHandlerForData").returnValue({
// 			verify: () => {
// 				throw new Error("oops");
// 			},
// 		});

// 		await context.blockProcessor.process(block);

// 		context.verificationFailedHandlerSpy.calledOnce();
// 	});

// 	it("should execute VerificationFailedHandler when block.verify() fails (containsMultiSignatures)", async (context) => {
// 		const block = {
// 			...context.baseBlock,
// 			verification: { containsMultiSignatures: true, errors: [], verified: true },
// 			verify: stubFn().returns(false),
// 		};

// 		await context.blockProcessor.process(block);

// 		context.verificationFailedHandlerSpy.calledOnce();
// 		assert.true(block.verify.calledOnce);
// 	});

// 	it("should execute IncompatibleTransactionsHandler when block contains incompatible transactions", async (context) => {
// 		const block = {
// 			...context.baseBlock,
// 			transactions: [
// 				{ data: { id: "1", version: 1 } } as Contracts.Crypto.ITransaction,
// 				{ data: { id: "2", version: 2 } } as Contracts.Crypto.ITransaction,
// 			],
// 		};

// 		await context.blockProcessor.process(block);

// 		context.incompatibleTransactionsHandlerSpy.calledOnce();
// 	});

// 	it("should execute NonceOutOfOrderHandler when block has out of order nonce", async (context) => {
// 		const baseTransactionData = {
// 			id: "1",
// 			nonce: BigNumber.make(2),
// 			senderPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
// 			version: 2,
// 		} as Contracts.Crypto.ITransactionData;
// 		const block = {
// 			...context.baseBlock,
// 			transactions: [
// 				{ data: { ...baseTransactionData } } as Contracts.Crypto.ITransaction,
// 				{
// 					data: { ...baseTransactionData, id: "2", nonce: BigNumber.make(4) },
// 				} as Contracts.Crypto.ITransaction,
// 			],
// 		};

// 		stub(context.walletRepository, "getNonce").returnValue(BigNumber.ONE);

// 		await context.blockProcessor.process(block);

// 		context.nonceOutOfOrderHandlerSpy.calledOnce();
// 	});

// 	it("should not execute NonceOutOfOrderHandler when block has v1 transactions and nonce out of order", async (context) => {
// 		const baseTransactionData = {
// 			id: "1",
// 			senderPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
// 			version: 1,
// 		} as Contracts.Crypto.ITransactionData;
// 		const block = {
// 			...context.baseBlock,
// 			transactions: [
// 				{ data: { ...baseTransactionData } } as Contracts.Crypto.ITransaction,
// 				{ data: { ...baseTransactionData, id: "2" } } as Contracts.Crypto.ITransaction,
// 			],
// 		};

// 		stub(context.walletRepository, "getNonce").returnValue(BigNumber.ONE);
// 		stub(context.roundState, "getActiveDelegates").returnValue([]);
// 		stub(context.blockchain, "getLastBlock").returnValue(context.baseBlock);
// 		stub(context.walletRepository, "findByPublicKey").returnValue({
// 			getAttribute: () => "generatorusername",
// 		});

// 		await context.blockProcessor.process(block);

// 		context.nonceOutOfOrderHandlerSpy.neverCalled();
// 	});

// 	it("should execute UnchainedHandler when block is not chained", async (context) => {
// 		const block = {
// 			...context.baseBlock,
// 		};
// 		stub(context.roundState, "getActiveDelegates").returnValue([]);
// 		stub(context.blockchain, "getLastBlock").returnValue(context.baseBlock);
// 		stub(context.walletRepository, "findByPublicKey").returnValue({
// 			getAttribute: () => "generatorusername",
// 		});

// 		await context.blockProcessor.process(block);

// 		context.unchainedHandlerSpy.calledOnce();
// 	});

// 	it("should execute InvalidGeneratorHandler when block has invalid generator", async (context) => {
// 		const block = {
// 			...context.chainedBlock,
// 		};
// 		stub(context.blockchain, "getLastBlock").returnValue(context.baseBlock);
// 		stub(context.walletRepository, "findByPublicKey").returnValue({
// 			getAttribute: () => "generatorusername",
// 		});

// 		const activeDelegatesWithoutGenerator = [];
// 		activeDelegatesWithoutGenerator.length = 51;
// 		activeDelegatesWithoutGenerator.fill(
// 			{
// 				getPublicKey: () => "02ff171adaef486b7db9fc160b28433d20cf43163d56fd28fee72145f0d5219a4b",
// 			},
// 			0,
// 		);

// 		stub(context.roundState, "getActiveDelegates").returnValue(activeDelegatesWithoutGenerator);

// 		await assert.resolves(() => context.blockProcessor.process(block));

// 		context.invalidGeneratorHandlerSpy.calledOnce();
// 	});

// 	it("should execute InvalidGeneratorHandler when generatorWallet.getAttribute() throws", async (context) => {
// 		const block = {
// 			...context.chainedBlock,
// 		};

// 		stub(context.blockchain, "getLastBlock").returnValue(context.baseBlock);
// 		stub(context.walletRepository, "findByPublicKey").returnValue({
// 			getAttribute: () => {
// 				throw new Error("oops");
// 			},
// 		});

// 		const notBlockGenerator = {
// 			publicKey: "02ff171adaef486b7db9fc160b28433d20cf43163d56fd28fee72145f0d5219a4b",
// 		};
// 		stub(context.roundState, "getActiveDelegates").returnValue([notBlockGenerator]);

// 		await context.blockProcessor.process(block);

// 		context.invalidGeneratorHandlerSpy.calledOnce();
// 	});

// 	it("should execute AlreadyForgedHandler when block has already forged transactions in database", async (context) => {
// 		const transactionData = {
// 			id: "34821dfa9cbe59aad663b972326ff19265d788c4d4142747606aa29b19d6b1dab",
// 			nonce: BigNumber.make(2),
// 			senderPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
// 			version: 2,
// 		} as Contracts.Crypto.ITransactionData;
// 		const block = {
// 			...context.chainedBlock,
// 			transactions: [{ data: transactionData, id: transactionData.id } as Contracts.Crypto.ITransaction],
// 		};
// 		stub(context.walletRepository, "getNonce").returnValue(BigNumber.ONE);
// 		stub(context.roundState, "getActiveDelegates").returnValue([]);
// 		stub(context.blockchain, "getLastBlock").returnValue(context.baseBlock);
// 		stub(context.walletRepository, "findByPublicKey").returnValue({
// 			getAttribute: () => "generatorusername",
// 		});
// 		stub(context.transactionRepository, "getForgedTransactionsIds").returnValue([transactionData.id]);
// 		stub(context.stateStore, "getLastBlock").returnValue(context.baseBlock);
// 		stub(context.stateStore, "getLastStoredBlockHeight").returnValue(context.baseBlock.data.height);
// 		stub(context.stateStore, "getLastBlocks").returnValue([]);

// 		await context.blockProcessor.process(block);

// 		context.alreadyForgedHandlerSpy.calledOnce();
// 	});

// 	it("should execute AlreadyForgedHandler when block has already forged transactions in stateStore", async (context) => {
// 		const transactionData = {
// 			id: "34821dfa9cbe59aad663b972326ff19265d788c4d4142747606aa29b19d6b1dab",
// 			nonce: BigNumber.make(2),
// 			senderPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
// 			version: 2,
// 		} as Contracts.Crypto.ITransactionData;
// 		const transactionData2 = {
// 			id: "34821dfa9cbe59aad663b972326ff19265d788c4d4142747606aa29b19d6b1dac",
// 			nonce: BigNumber.make(3),
// 			senderPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
// 			version: 2,
// 		} as Contracts.Crypto.ITransactionData;
// 		const block = {
// 			...context.chainedBlock,
// 			transactions: [{ data: transactionData, id: transactionData.id } as Contracts.Crypto.ITransaction],
// 		};

// 		stub(context.walletRepository, "getNonce").returnValue(BigNumber.ONE);
// 		stub(context.roundState, "getActiveDelegates").returnValue([]);
// 		stub(context.blockchain, "getLastBlock").returnValue(context.baseBlock);
// 		stub(context.walletRepository, "findByPublicKey").returnValue({
// 			getAttribute: () => "generatorusername",
// 		});
// 		stub(context.transactionRepository, "getForgedTransactionsIds").returnValue([]);
// 		stub(context.stateStore, "getLastBlock").returnValue({ data: { height: 2 } });
// 		stub(context.stateStore, "getLastBlocks").returnValue([
// 			{ data: { height: 2 }, transactions: [transactionData, transactionData2] },
// 		]);
// 		stub(context.stateStore, "getLastStoredBlockHeight").returnValue(1);

// 		await context.blockProcessor.process(block);

// 		context.alreadyForgedHandlerSpy.calledOnce();
// 	});

// 	it("should execute AcceptBlockHandler when all above verifications passed", async (context) => {
// 		const block = {
// 			...context.chainedBlock,
// 		};
// 		stub(context.roundState, "getActiveDelegates").returnValue([]);
// 		stub(context.blockchain, "getLastBlock").returnValue(context.baseBlock);
// 		stub(context.walletRepository, "findByPublicKey").returnValue({
// 			getAttribute: () => "generatorusername",
// 		});
// 		stub(context.transactionRepository, "getForgedTransactionsIds").returnValue([]);

// 		await context.blockProcessor.process(block);

// 		context.acceptBlockHandlerSpy.calledOnce();
// 	});
// });
