import { Application, Container, Contracts } from "@arkecosystem/core-kernel";
import { Stores, Wallets } from "@arkecosystem/core-state";
import { describe, Factories, Generators } from "@arkecosystem/core-test-framework";
import { Crypto, Enums, Interfaces, Managers, Transactions } from "@arkecosystem/crypto";

import { buildMultiSignatureWallet, buildRecipientWallet, buildSenderWallet, initApp } from "../../../test/app";
import { TransactionHandlerRegistry } from "../handler-registry";
import { TransactionHandler } from "../transaction";

describe<{
	app: Application;
	senderWallet: Wallets.Wallet;
	multiSignatureWallet: Wallets.Wallet;
	recipientWallet: Wallets.Wallet;
	walletRepository: Contracts.State.WalletRepository;
	handler: TransactionHandler;
	store: any;
}>("DelegateRegistrationTransaction V1", ({ assert, afterEach, beforeEach, it, spyFn, stub }) => {
	beforeEach(async (context) => {
		const mockLastBlockData: Partial<Interfaces.IBlockData> = { height: 4, timestamp: Crypto.Slots.getTime() };
		context.store = stub(Stores.StateStore.prototype, "getLastBlock").returnValue({ data: mockLastBlockData });

		let transactionHistoryService = {
			streamByCriteria: spyFn(),
		};

		const config = Generators.generateCryptoConfigRaw();
		Managers.configManager.setConfig(config);
		Managers.configManager.getMilestone().aip11 = false;

		context.app = initApp();
		context.app.bind(Container.Identifiers.TransactionHistoryService).toConstantValue(transactionHistoryService);

		context.walletRepository = context.app.get<Wallets.WalletRepository>(Container.Identifiers.WalletRepository);

		const factoryBuilder = new Factories.FactoryBuilder();
		Factories.Factories.registerWalletFactory(factoryBuilder);
		Factories.Factories.registerTransactionFactory(factoryBuilder);

		context.senderWallet = buildSenderWallet(factoryBuilder);
		context.multiSignatureWallet = buildMultiSignatureWallet();
		context.recipientWallet = buildRecipientWallet(factoryBuilder);

		context.walletRepository.index(context.senderWallet);
		context.walletRepository.index(context.multiSignatureWallet);
		context.walletRepository.index(context.recipientWallet);

		const transactionHandlerRegistry: TransactionHandlerRegistry = context.app.get<TransactionHandlerRegistry>(
			Container.Identifiers.TransactionHandlerRegistry,
		);
		context.handler = transactionHandlerRegistry.getRegisteredHandlerByType(
			Transactions.InternalTransactionType.from(
				Enums.TransactionType.DelegateRegistration,
				Enums.TransactionTypeGroup.Core,
			),
			1,
		);
	});

	afterEach((context) => {
		context.store.restore();
	});

	it("dependencies should return empty array", async (context) => {
		assert.equal(context.handler.dependencies(), []);
	});

	it("walletAttributes should return array", async (context) => {
		const attributes = context.handler.walletAttributes();

		assert.array(attributes);
		assert.is(attributes.length, 11);
	});

	it("getConstructor should return v1 constructor", async (context) => {
		assert.equal(context.handler.getConstructor(), Transactions.One.DelegateRegistrationTransaction);
	});

	it("bootstrap should resolve", async (context) => {
		await assert.resolves(() => context.handler.bootstrap());
	});

	it("isActivated should return true", async (context) => {
		assert.true(await context.handler.isActivated());
	});
});
