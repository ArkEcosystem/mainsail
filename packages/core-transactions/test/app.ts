import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Application, Container, Providers, Services } from "@arkecosystem/core-kernel";
import { Stores, Wallets } from "@arkecosystem/core-state";
import { Factories, getWalletAttributeSet, Mocks, passphrases } from "@arkecosystem/core-test-framework";
import {
	ApplyTransactionAction,
	Collator,
	ExpirationService,
	Mempool,
	Query,
	RevertTransactionAction,
	SenderMempool,
	SenderState,
	ThrowIfCannotEnterPoolAction,
	VerifyTransactionAction,
} from "@arkecosystem/core-transaction-pool";
import { Identities } from "@arkecosystem/crypto";

import { FeeMatcher as DynamicFeeMatcher } from "../../core-fees-managed/source/matcher";
import { TransactionHandlerProvider } from "../source/handlers/handler-provider";
import { TransactionHandlerRegistry } from "../source/handlers/handler-registry";
import {
	DelegateRegistrationTransactionHandler,
	DelegateResignationTransactionHandler,
	MultiPaymentTransactionHandler,
	MultiSignatureRegistrationTransactionHandler,
	TransferTransactionHandler,
	VoteTransactionHandler,
} from "../source/handlers/one";
import { ServiceProvider } from "../source/service-provider";

const logger = {
	debug: () => {},
	notice: () => {},
	warning: () => {},
};

export const initApp = (): Application => {
	const app: Application = new Application(new Container.Container());
	app.bind(Identifiers.ApplicationNamespace).toConstantValue("testnet");

	app.bind(Identifiers.LogService).toConstantValue(logger);

	app.bind<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes)
		.to(Services.Attributes.AttributeSet)
		.inSingletonScope();

	app.bind<Contracts.State.WalletIndexerIndex>(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		autoIndex: true,
		indexer: Wallets.addressesIndexer,
		name: Contracts.State.WalletIndexes.Addresses,
	});

	app.bind<Contracts.State.WalletIndexerIndex>(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		autoIndex: true,
		indexer: Wallets.publicKeysIndexer,
		name: Contracts.State.WalletIndexes.PublicKeys,
	});

	app.bind<Contracts.State.WalletIndexerIndex>(Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		autoIndex: true,
		indexer: Wallets.usernamesIndexer,
		name: Contracts.State.WalletIndexes.Usernames,
	});

	app.bind(Identifiers.WalletFactory).toFactory<Contracts.State.Wallet>(
		(context: Container.interfaces.Context) => (address: string) =>
			new Wallets.Wallet(
				address,
				new Services.Attributes.AttributeMap(
					context.container.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes),
				),
			),
	);

	app.bind(Identifiers.PluginConfiguration).to(Providers.PluginConfiguration).inSingletonScope();

	app.get<Providers.PluginConfiguration>(Identifiers.PluginConfiguration).set("maxTransactionAge", 500);
	app.get<Providers.PluginConfiguration>(Identifiers.PluginConfiguration).set("maxTransactionBytes", 2_000_000);
	app.get<Providers.PluginConfiguration>(Identifiers.PluginConfiguration).set("maxTransactionsPerSender", 300);

	app.bind(Identifiers.StateStore).to(Stores.StateStore).inTransientScope();

	app.bind(Identifiers.TransactionPoolMempool).to(Mempool).inSingletonScope();

	app.bind(Identifiers.TransactionPoolQuery).to(Query).inSingletonScope();

	app.bind(Identifiers.TransactionPoolCollator).to(Collator);
	app.bind(Identifiers.Fee.Matcher).to(DynamicFeeMatcher);
	app.bind(Identifiers.TransactionPoolExpirationService).to(ExpirationService);

	app.bind(Identifiers.TransactionPoolSenderMempool).to(SenderMempool);
	app.bind(Identifiers.TransactionPoolSenderMempoolFactory).toAutoFactory(Identifiers.TransactionPoolSenderMempool);
	app.bind(Identifiers.TransactionPoolSenderState).to(SenderState);

	app.bind(Identifiers.WalletRepository).to(Wallets.WalletRepository).inSingletonScope();

	app.bind(Identifiers.EventDispatcherService).to(Services.Events.NullEventDispatcher).inSingletonScope();

	app.bind(Identifiers.DatabaseBlockRepository).toConstantValue(Mocks.BlockRepository.instance);

	app.bind(Identifiers.DatabaseTransactionRepository).toConstantValue(Mocks.TransactionRepository.instance);

	app.bind(Identifiers.TransactionHandler).to(TransferTransactionHandler);
	app.bind(Identifiers.TransactionHandler).to(DelegateRegistrationTransactionHandler);
	app.bind(Identifiers.TransactionHandler).to(VoteTransactionHandler);
	app.bind(Identifiers.TransactionHandler).to(MultiSignatureRegistrationTransactionHandler);
	app.bind(Identifiers.TransactionHandler).to(MultiPaymentTransactionHandler);
	app.bind(Identifiers.TransactionHandler).to(DelegateResignationTransactionHandler);

	app.bind(Identifiers.TransactionHandlerProvider).to(TransactionHandlerProvider).inSingletonScope();
	app.bind(Identifiers.TransactionHandlerRegistry).to(TransactionHandlerRegistry).inSingletonScope();
	app.bind(Identifiers.TransactionHandlerConstructors).toDynamicValue(
		ServiceProvider.getTransactionHandlerConstructorsBinding(),
	);

	app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();

	app.get<Services.Triggers.Triggers>(Identifiers.TriggerService).bind(
		"verifyTransaction",
		new VerifyTransactionAction(),
	);

	app.get<Services.Triggers.Triggers>(Identifiers.TriggerService).bind(
		"throwIfCannotEnterPool",
		new ThrowIfCannotEnterPoolAction(),
	);

	app.get<Services.Triggers.Triggers>(Identifiers.TriggerService).bind(
		"applyTransaction",
		new ApplyTransactionAction(),
	);

	app.get<Services.Triggers.Triggers>(Identifiers.TriggerService).bind(
		"revertTransaction",
		new RevertTransactionAction(),
	);

	return app;
};

export const buildSenderWallet = (
	factoryBuilder: Factories.FactoryBuilder,
	passphrase: string = passphrases[0],
): Wallets.Wallet => {
	const wallet: Wallets.Wallet = factoryBuilder
		.get("Wallet")
		.withOptions({
			nonce: 0,
			passphrase: passphrases[0],
		})
		.make();

	wallet.setBalance(BigNumber.make(7_527_654_310));

	return wallet;
};

export const buildRecipientWallet = (factoryBuilder: Factories.FactoryBuilder): Wallets.Wallet =>
	factoryBuilder
		.get("Wallet")
		.withOptions({
			passphrase: "passphrase2",
		})
		.make();

export const buildMultiSignatureWallet = (): Wallets.Wallet => {
	const multiSignatureAsset: Crypto.IMultiSignatureAsset = {
		min: 2,
		publicKeys: [
			Identities.PublicKey.fromPassphrase(passphrases[0]),
			Identities.PublicKey.fromPassphrase(passphrases[1]),
			Identities.PublicKey.fromPassphrase(passphrases[2]),
		],
	};

	const wallet = new Wallets.Wallet(
		Identities.Address.fromMultiSignatureAsset(multiSignatureAsset),
		new Services.Attributes.AttributeMap(getWalletAttributeSet()),
	);
	wallet.setPublicKey(Identities.PublicKey.fromMultiSignatureAsset(multiSignatureAsset));
	wallet.setBalance(BigNumber.make(100_390_000_000));
	wallet.setAttribute("multiSignature", multiSignatureAsset);

	return wallet;
};
