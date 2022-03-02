import { BlockProcessor } from "@packages/core-blockchain/source/processor/block-processor";
import {
	AcceptBlockHandler,
	AlreadyForgedHandler,
	ExceptionHandler,
	IncompatibleTransactionsHandler,
	InvalidGeneratorHandler,
	NonceOutOfOrderHandler,
	UnchainedHandler,
	VerificationFailedHandler,
} from "@packages/core-blockchain/source/processor/handlers";
import { Services } from "@packages/core-kernel";
import { GetActiveDelegatesAction } from "@packages/core-state/source/actions";
import { Sandbox } from "@packages/core-test-framework";
import { Interfaces, Utils } from "@packages/crypto";

describe("BlockProcessor", () => {
	AcceptBlockHandler.prototype.execute = jest.fn();
	AlreadyForgedHandler.prototype.execute = jest.fn();
	ExceptionHandler.prototype.execute = jest.fn();
	IncompatibleTransactionsHandler.prototype.execute = jest.fn();
	InvalidGeneratorHandler.prototype.execute = jest.fn();
	NonceOutOfOrderHandler.prototype.execute = jest.fn();
	UnchainedHandler.prototype.initialize = jest.fn();
	UnchainedHandler.prototype.execute = jest.fn();
	VerificationFailedHandler.prototype.execute = jest.fn();

	const sandbox = new Sandbox();

	const logService = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() };
	const blockchain = { getLastBlock: jest.fn() };
	const transactionRepository = { getForgedTransactionsIds: jest.fn() };

	const walletRepository = {
		findByPublicKey: jest.fn(),
		getNonce: jest.fn(),
	};
	const transactionHandlerRegistry = {
		getActivatedHandlerForData: jest.fn(),
	};
	const databaseService = {};
	const databaseInteractions = {
		deleteRound: jest.fn(),
		getLastBlock: jest.fn(),
		getTopBlocks: jest.fn(),
		restoreCurrentRound: jest.fn(),
		revertBlock: jest.fn(),
		walletRepository: {
			getNonce: jest.fn(),
		},
	};
	const roundState = {
		getActiveDelegates: jest.fn().mockReturnValue([]),
	};
	const stateStore = {
		getLastBlock: jest.fn(),
		getLastBlocks: jest.fn(),
		getLastStoredBlockHeight: jest.fn(),
	};

	const databaseInterceptor = {};

	beforeAll(() => {
		sandbox.app.bind(Identifiers.LogService).toConstantValue(logService);
		sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(blockchain);
		sandbox.app.bind(Identifiers.DatabaseTransactionRepository).toConstantValue(transactionRepository);
		sandbox.app.bind(Identifiers.WalletRepository).toConstantValue(walletRepository);
		sandbox.app.bind(Identifiers.DatabaseService).toConstantValue(databaseService);
		sandbox.app.bind(Identifiers.DatabaseInteraction).toConstantValue(databaseInteractions);
		sandbox.app.bind(Identifiers.DatabaseInterceptor).toConstantValue(databaseInterceptor);
		sandbox.app.bind(Identifiers.RoundState).toConstantValue(roundState);
		sandbox.app.bind(Identifiers.TransactionHandlerRegistry).toConstantValue(transactionHandlerRegistry);
		sandbox.app.bind(Identifiers.StateStore).toConstantValue(stateStore);
		sandbox.app.bind(Identifiers.TransactionPoolService).toConstantValue({});

		sandbox.app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();
		sandbox.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("getActiveDelegates", new GetActiveDelegatesAction(sandbox.app));
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	const baseBlock = {
		data: {
			height: 2,
			generatorPublicKey: "026c598170201caf0357f202ff14f365a3b09322071e347873869f58d776bfc565",
			id: "17882607875259085966",
			blockSignature:
				"3045022100e7385c6ea42bd950f7f6ab8c8619cf2f66a41d8f8f185b0bc99af032cb25f30d02200b6210176a6cedfdcbe483167fd91c21d740e0e4011d24d679c601fdd46b0de9",
			numberOfTransactions: 0,
			createdAt: "2018-09-11T16:48:50.550Z",
			payloadLength: 0,
			payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			previousBlock: "17184958558311101492",
			reward: Utils.BigNumber.make("0"),
			timestamp: 46_583_330,
			totalAmount: Utils.BigNumber.make("0"),
			version: 0,
			totalFee: Utils.BigNumber.make("0"),
		},
		getHeader: jest.fn(),
		serialized: "",
		toJson: jest.fn(),
		transactions: [],
		verification: { containsMultiSignatures: false, errors: [], verified: true },
		verify: jest.fn(),
		verifySignature: jest.fn(),
	};

	describe("when block does not verify", () => {
		it("should execute VerificationFailedHandler when !block.verification.verified", async () => {
			const block = { ...baseBlock, verification: { ...baseBlock.verification, verified: false } };

			const blockProcessor = sandbox.app.resolve<BlockProcessor>(BlockProcessor);

			await blockProcessor.process(block);

			expect(VerificationFailedHandler.prototype.execute).toBeCalledTimes(1);
		});

		it("should execute VerificationFailedHandler when handler.verify() fails on one transaction (containsMultiSignatures)", async () => {
			const block = {
				...baseBlock,
				transactions: [
					{
						data: {
							amount: Utils.BigNumber.make("12500000000000000"),
							asset: {},
							fee: Utils.BigNumber.ZERO,
							id: "3e3817fd0c35bc36674f3874c2953fa3e35877cbcdb44a08bdc6083dbd39d572",
							recipientId: "D6Z26L69gdk9qYmTv5uzk3uGepigtHY4ax",
							senderPublicKey: "0208e6835a8f020cfad439c059b89addc1ce21f8cab0af6e6957e22d3720bff8a4",
							signature:
								"304402203a3f0f80aad4e0561ae975f241f72a074245f1205d676d290d6e5630ed4c027502207b31fee68e64007c380a4b6baccd4db9b496daef5f7894676586e1347ac30a3b",
							type: 0,
							timestamp: 0,
							typeGroup: 1,
							version: 1,
						},
					} as Crypto.ITransaction,
				],
				verification: { containsMultiSignatures: true, errors: [], verified: true },
				verify: jest.fn().mockReturnValue(true),
			};
			transactionHandlerRegistry.getActivatedHandlerForData = jest.fn().mockReturnValueOnce({
				verify: jest.fn().mockRejectedValueOnce(new Error("oops")),
			});
			const blockProcessor = sandbox.app.resolve<BlockProcessor>(BlockProcessor);

			await blockProcessor.process(block);

			expect(VerificationFailedHandler.prototype.execute).toBeCalledTimes(1);
		});

		it("should execute VerificationFailedHandler when block.verify() fails (containsMultiSignatures)", async () => {
			const block = {
				...baseBlock,
				verification: { containsMultiSignatures: true, errors: [], verified: true },
				verify: jest.fn().mockReturnValue(false),
			};

			const blockProcessor = sandbox.app.resolve<BlockProcessor>(BlockProcessor);

			await blockProcessor.process(block);

			expect(VerificationFailedHandler.prototype.execute).toBeCalledTimes(1);
			expect(block.verify).toBeCalledTimes(1);
		});
	});

	it("should execute IncompatibleTransactionsHandler when block contains incompatible transactions", async () => {
		const block = {
			...baseBlock,
			transactions: [
				{ data: { id: "1", version: 1 } } as Crypto.ITransaction,
				{ data: { id: "2", version: 2 } } as Crypto.ITransaction,
			],
		};

		const blockProcessor = sandbox.app.resolve<BlockProcessor>(BlockProcessor);

		await blockProcessor.process(block);

		expect(IncompatibleTransactionsHandler.prototype.execute).toBeCalledTimes(1);
	});

	describe("when nonce out of order", () => {
		it("should execute NonceOutOfOrderHandler when block has out of order nonce", async () => {
			const baseTransactionData = {
				id: "1",
				nonce: Utils.BigNumber.make(2),
				senderPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
				version: 2,
			} as Crypto.ITransactionData;
			const block = {
				...baseBlock,
				transactions: [
					{ data: { ...baseTransactionData } } as Crypto.ITransaction,
					{
						data: { ...baseTransactionData, id: "2", nonce: Utils.BigNumber.make(4) },
					} as Crypto.ITransaction,
				],
			};

			walletRepository.getNonce = jest.fn().mockReturnValueOnce(Utils.BigNumber.ONE);

			const blockProcessor = sandbox.app.resolve<BlockProcessor>(BlockProcessor);

			await blockProcessor.process(block);

			expect(NonceOutOfOrderHandler.prototype.execute).toBeCalledTimes(1);
		});

		it("should not execute NonceOutOfOrderHandler when block has v1 transactions", async () => {
			const baseTransactionData = {
				id: "1",
				senderPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
				version: 1,
			} as Crypto.ITransactionData;
			const block = {
				...baseBlock,
				transactions: [
					{ data: { ...baseTransactionData } } as Crypto.ITransaction,
					{ data: { ...baseTransactionData, id: "2" } } as Crypto.ITransaction,
				],
			};

			walletRepository.getNonce = jest.fn().mockReturnValueOnce(Utils.BigNumber.ONE);
			roundState.getActiveDelegates = jest.fn().mockReturnValueOnce([]);
			blockchain.getLastBlock = jest.fn().mockReturnValueOnce(baseBlock);
			const generatorWallet = {
				getAttribute: jest.fn().mockReturnValue("generatorusername"),
			};
			walletRepository.findByPublicKey = jest.fn().mockReturnValueOnce(generatorWallet);
			UnchainedHandler.prototype.initialize = jest.fn().mockReturnValueOnce(new UnchainedHandler());

			const blockProcessor = sandbox.app.resolve<BlockProcessor>(BlockProcessor);

			await blockProcessor.process(block);

			expect(NonceOutOfOrderHandler.prototype.execute).toBeCalledTimes(0);
		});
	});

	it("should execute UnchainedHandler when block is not chained", async () => {
		const block = {
			...baseBlock,
		};
		blockchain.getLastBlock = jest.fn().mockReturnValueOnce(baseBlock);
		const generatorWallet = {
			getAttribute: jest.fn().mockReturnValue("generatorusername"),
		};
		walletRepository.findByPublicKey = jest.fn().mockReturnValueOnce(generatorWallet);
		UnchainedHandler.prototype.initialize = jest.fn().mockReturnValueOnce(new UnchainedHandler());
		roundState.getActiveDelegates = jest.fn().mockReturnValueOnce([]);

		const blockProcessor = sandbox.app.resolve<BlockProcessor>(BlockProcessor);

		await blockProcessor.process(block);

		expect(UnchainedHandler.prototype.execute).toBeCalledTimes(1);
	});

	const chainedBlock = {
		data: {
			height: 3,
			generatorPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
			id: "7242383292164246617",
			blockSignature:
				"304402204087bb1d2c82b9178b02b9b3f285de260cdf0778643064fe6c7aef27321d49520220594c57009c1fca543350126d277c6adeb674c00685a464c3e4bf0d634dc37e39",
			numberOfTransactions: 0,
			createdAt: "2018-09-11T16:48:58.431Z",
			payloadLength: 0,
			payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			previousBlock: "17882607875259085966",
			reward: Utils.BigNumber.make("0"),
			timestamp: 46_583_338,
			totalAmount: Utils.BigNumber.make("0"),
			version: 0,
			totalFee: Utils.BigNumber.make("0"),
		},
		getHeader: jest.fn(),
		serialized: "",
		toJson: jest.fn(),
		transactions: [],
		verification: { containsMultiSignatures: false, errors: [], verified: true },
		verify: jest.fn(),
		verifySignature: jest.fn(),
	};
	describe("when invalid generator", () => {
		it("should execute InvalidGeneratorHandler when block has invalid generator", async () => {
			const block = {
				...chainedBlock,
			};
			blockchain.getLastBlock = jest.fn().mockReturnValueOnce(baseBlock);
			const generatorWallet = {
				getAttribute: jest.fn().mockReturnValue("generatorusername"),
			};
			walletRepository.findByPublicKey = jest
				.fn()
				.mockReturnValueOnce(generatorWallet)
				.mockReturnValueOnce(generatorWallet);
			const notBlockGenerator = {
				getPublicKey: () => "02ff171adaef486b7db9fc160b28433d20cf43163d56fd28fee72145f0d5219a4b",
			};

			const activeDelegatesWithoutGenerator = [];
			activeDelegatesWithoutGenerator.length = 51;
			activeDelegatesWithoutGenerator.fill(notBlockGenerator, 0);

			roundState.getActiveDelegates = jest.fn().mockReturnValueOnce(activeDelegatesWithoutGenerator);

			const blockProcessor = sandbox.app.resolve<BlockProcessor>(BlockProcessor);

			await expect(blockProcessor.process(block)).toResolve();

			expect(InvalidGeneratorHandler.prototype.execute).toBeCalledTimes(1);
		});

		it("should execute InvalidGeneratorHandler when generatorWallet.getAttribute() throws", async () => {
			const block = {
				...chainedBlock,
			};
			blockchain.getLastBlock = jest.fn().mockReturnValueOnce(baseBlock);
			const generatorWallet = {
				getAttribute: jest.fn().mockImplementation(() => {
					throw new Error("oops");
				}),
			};
			walletRepository.findByPublicKey = jest
				.fn()
				.mockReturnValueOnce(generatorWallet)
				.mockReturnValueOnce(generatorWallet);
			const notBlockGenerator = {
				publicKey: "02ff171adaef486b7db9fc160b28433d20cf43163d56fd28fee72145f0d5219a4b",
			};

			roundState.getActiveDelegates = jest.fn().mockReturnValueOnce([notBlockGenerator]);

			const blockProcessor = sandbox.app.resolve<BlockProcessor>(BlockProcessor);

			await blockProcessor.process(block);

			expect(InvalidGeneratorHandler.prototype.execute).toBeCalledTimes(1);
		});
	});

	it("should execute AlreadyForgedHandler when block has already forged transactions in database", async () => {
		const transactionData = {
			id: "34821dfa9cbe59aad663b972326ff19265d788c4d4142747606aa29b19d6b1dab",
			nonce: Utils.BigNumber.make(2),
			senderPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
			version: 2,
		} as Crypto.ITransactionData;
		const block = {
			...chainedBlock,
			transactions: [{ data: transactionData, id: transactionData.id } as Crypto.ITransaction],
		};
		roundState.getActiveDelegates = jest.fn().mockReturnValueOnce([]);
		blockchain.getLastBlock = jest.fn().mockReturnValueOnce(baseBlock);
		transactionRepository.getForgedTransactionsIds = jest.fn().mockReturnValueOnce([transactionData.id]);
		walletRepository.getNonce = jest.fn().mockReturnValueOnce(Utils.BigNumber.ONE);
		const generatorWallet = {
			getAttribute: jest.fn().mockReturnValue("generatorusername"),
		};
		walletRepository.findByPublicKey = jest.fn().mockReturnValueOnce(generatorWallet);
		stateStore.getLastBlock.mockReturnValueOnce(baseBlock);
		stateStore.getLastStoredBlockHeight.mockReturnValueOnce(baseBlock.data.height);
		stateStore.getLastBlocks.mockReturnValueOnce([]);

		const blockProcessor = sandbox.app.resolve<BlockProcessor>(BlockProcessor);

		await blockProcessor.process(block);

		expect(AlreadyForgedHandler.prototype.execute).toBeCalledTimes(1);
	});

	it("should execute AlreadyForgedHandler when block has already forged transactions in stateStore", async () => {
		const transactionData = {
			id: "34821dfa9cbe59aad663b972326ff19265d788c4d4142747606aa29b19d6b1dab",
			nonce: Utils.BigNumber.make(2),
			senderPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
			version: 2,
		} as Crypto.ITransactionData;
		const transactionData2 = {
			id: "34821dfa9cbe59aad663b972326ff19265d788c4d4142747606aa29b19d6b1dac",
			nonce: Utils.BigNumber.make(3),
			senderPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
			version: 2,
		} as Crypto.ITransactionData;
		const block = {
			...chainedBlock,
			transactions: [{ data: transactionData, id: transactionData.id } as Crypto.ITransaction],
		};
		roundState.getActiveDelegates = jest.fn().mockReturnValueOnce([]);
		blockchain.getLastBlock = jest.fn().mockReturnValueOnce(baseBlock);
		transactionRepository.getForgedTransactionsIds = jest.fn().mockReturnValueOnce([]);
		walletRepository.getNonce = jest.fn().mockReturnValueOnce(Utils.BigNumber.ONE);
		const generatorWallet = {
			getAttribute: jest.fn().mockReturnValue("generatorusername"),
		};
		walletRepository.findByPublicKey = jest.fn().mockReturnValueOnce(generatorWallet);
		stateStore.getLastBlock.mockReturnValueOnce({ data: { height: 2 } });
		stateStore.getLastBlocks.mockReturnValueOnce([
			{ data: { height: 2 }, transactions: [transactionData, transactionData2] },
		]);
		stateStore.getLastStoredBlockHeight.mockReturnValue(1);

		const blockProcessor = sandbox.app.resolve<BlockProcessor>(BlockProcessor);

		await blockProcessor.process(block);

		expect(AlreadyForgedHandler.prototype.execute).toBeCalledTimes(1);
	});

	it("should execute AcceptBlockHandler when all above verifications passed", async () => {
		const block = {
			...chainedBlock,
		};
		roundState.getActiveDelegates = jest.fn().mockReturnValueOnce([]);
		blockchain.getLastBlock = jest.fn().mockReturnValueOnce(baseBlock);
		transactionRepository.getForgedTransactionsIds = jest.fn().mockReturnValueOnce([]);
		const generatorWallet = {
			getAttribute: jest.fn().mockReturnValue("generatorusername"),
		};
		walletRepository.findByPublicKey = jest.fn().mockReturnValueOnce(generatorWallet);

		const blockProcessor = sandbox.app.resolve<BlockProcessor>(BlockProcessor);

		await blockProcessor.process(block);

		expect(AcceptBlockHandler.prototype.execute).toBeCalledTimes(1);
	});
});
