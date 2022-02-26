import { Application, Container, Contracts, Providers, Services } from "@arkecosystem/core-kernel";
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
import { Identities, Utils } from "@arkecosystem/crypto";
import Interfaces from "@arkecosystem/core-crypto-contracts";

import { ServiceProvider } from "../source/service-provider";
import { TransactionHandlerProvider } from "../source/handlers/handler-provider";
import { TransactionHandlerRegistry } from "../source/handlers/handler-registry";
import { FeeMatcher as DynamicFeeMatcher } from "../../core-fees-managed/source/matcher";
import {
	DelegateRegistrationTransactionHandler,
	DelegateResignationTransactionHandler,
	MultiPaymentTransactionHandler,
	MultiSignatureRegistrationTransactionHandler,
	TransferTransactionHandler,
	VoteTransactionHandler,
} from "../source/handlers/one";

const logger = {
	debug: () => {},
	notice: () => {},
	warning: () => {},
};

export const initApp = (): Application => {
	const app: Application = new Application(new Container.Container());
	app.bind(Container.Identifiers.ApplicationNamespace).toConstantValue("testnet");

	app.bind(Container.Identifiers.LogService).toConstantValue(logger);

	app.bind<Services.Attributes.AttributeSet>(Container.Identifiers.WalletAttributes)
		.to(Services.Attributes.AttributeSet)
		.inSingletonScope();

	app.bind<Contracts.State.WalletIndexerIndex>(Container.Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		autoIndex: true,
		indexer: Wallets.addressesIndexer,
		name: Contracts.State.WalletIndexes.Addresses,
	});

	app.bind<Contracts.State.WalletIndexerIndex>(Container.Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		autoIndex: true,
		indexer: Wallets.publicKeysIndexer,
		name: Contracts.State.WalletIndexes.PublicKeys,
	});

	app.bind<Contracts.State.WalletIndexerIndex>(Container.Identifiers.WalletRepositoryIndexerIndex).toConstantValue({
		autoIndex: true,
		indexer: Wallets.usernamesIndexer,
		name: Contracts.State.WalletIndexes.Usernames,
	});

	app.bind(Container.Identifiers.WalletFactory).toFactory<Contracts.State.Wallet>(
		(context: Container.interfaces.Context) => (address: string) =>
			new Wallets.Wallet(
				address,
				new Services.Attributes.AttributeMap(
					context.container.get<Services.Attributes.AttributeSet>(Container.Identifiers.WalletAttributes),
				),
			),
	);

	app.bind(Container.Identifiers.PluginConfiguration).to(Providers.PluginConfiguration).inSingletonScope();

	app.get<Providers.PluginConfiguration>(Container.Identifiers.PluginConfiguration).set("maxTransactionAge", 500);
	app.get<Providers.PluginConfiguration>(Container.Identifiers.PluginConfiguration).set(
		"maxTransactionBytes",
		2_000_000,
	);
	app.get<Providers.PluginConfiguration>(Container.Identifiers.PluginConfiguration).set(
		"maxTransactionsPerSender",
		300,
	);

	app.bind(Container.Identifiers.StateStore).to(Stores.StateStore).inTransientScope();

	app.bind(Container.Identifiers.TransactionPoolMempool).to(Mempool).inSingletonScope();

	app.bind(Container.Identifiers.TransactionPoolQuery).to(Query).inSingletonScope();

	app.bind(Container.Identifiers.TransactionPoolCollator).to(Collator);
	app.bind(Container.Identifiers.Fee.Matcher).to(DynamicFeeMatcher);
	app.bind(Container.Identifiers.TransactionPoolExpirationService).to(ExpirationService);

	app.bind(Container.Identifiers.TransactionPoolSenderMempool).to(SenderMempool);
	app.bind(Container.Identifiers.TransactionPoolSenderMempoolFactory).toAutoFactory(
		Container.Identifiers.TransactionPoolSenderMempool,
	);
	app.bind(Container.Identifiers.TransactionPoolSenderState).to(SenderState);

	app.bind(Container.Identifiers.WalletRepository).to(Wallets.WalletRepository).inSingletonScope();

	app.bind(Container.Identifiers.EventDispatcherService).to(Services.Events.NullEventDispatcher).inSingletonScope();

	app.bind(Container.Identifiers.DatabaseBlockRepository).toConstantValue(Mocks.BlockRepository.instance);

	app.bind(Container.Identifiers.DatabaseTransactionRepository).toConstantValue(Mocks.TransactionRepository.instance);

	app.bind(Container.Identifiers.TransactionHandler).to(TransferTransactionHandler);
	app.bind(Container.Identifiers.TransactionHandler).to(DelegateRegistrationTransactionHandler);
	app.bind(Container.Identifiers.TransactionHandler).to(VoteTransactionHandler);
	app.bind(Container.Identifiers.TransactionHandler).to(MultiSignatureRegistrationTransactionHandler);
	app.bind(Container.Identifiers.TransactionHandler).to(MultiPaymentTransactionHandler);
	app.bind(Container.Identifiers.TransactionHandler).to(DelegateResignationTransactionHandler);

	app.bind(Container.Identifiers.TransactionHandlerProvider).to(TransactionHandlerProvider).inSingletonScope();
	app.bind(Container.Identifiers.TransactionHandlerRegistry).to(TransactionHandlerRegistry).inSingletonScope();
	app.bind(Container.Identifiers.TransactionHandlerConstructors).toDynamicValue(
		ServiceProvider.getTransactionHandlerConstructorsBinding(),
	);

	app.bind(Container.Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();

	app.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService).bind(
		"verifyTransaction",
		new VerifyTransactionAction(),
	);

	app.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService).bind(
		"throwIfCannotEnterPool",
		new ThrowIfCannotEnterPoolAction(),
	);

	app.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService).bind(
		"applyTransaction",
		new ApplyTransactionAction(),
	);

	app.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService).bind(
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

	wallet.setBalance(Utils.BigNumber.make(7_527_654_310));

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
	const multiSignatureAsset: Interfaces.IMultiSignatureAsset = {
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
	wallet.setBalance(Utils.BigNumber.make(100_390_000_000));
	wallet.setAttribute("multiSignature", multiSignatureAsset);

	return wallet;
};
