import "jest-extended";

import { Container, Providers, Services } from "@packages/core-kernel";
import { DposPreviousRoundStateProvider } from "@packages/core-kernel/source/contracts/state";
import { PluginConfiguration } from "@packages/core-kernel/source/providers";
import { dposPreviousRoundStateProvider } from "@packages/core-state/source";
import { BuildDelegateRankingAction } from "@packages/core-state/source/actions";
import { BlockState } from "@packages/core-state/source/block-state";
import { defaults } from "@packages/core-state/source/defaults";
import { DposState } from "@packages/core-state/source/dpos/dpos";
import { StateBuilder } from "@packages/core-state/source/state-builder";
import { StateStore } from "@packages/core-state/source/stores/state";
import { TransactionValidator } from "@packages/core-state/source/transaction-validator";
import {
	WalletRepository,
	WalletRepositoryClone,
	WalletRepositoryCopyOnWrite,
} from "@packages/core-state/source/wallets";
import { registerIndexers } from "@packages/core-state/source/wallets/indexers";
import { walletFactory } from "@packages/core-state/source/wallets/wallet-factory";
import { Sandbox } from "@packages/core-test-framework/source";
import { Factories, FactoryBuilder } from "@packages/core-test-framework/source/factories";

export interface Spies {
	applySpy: jest.SpyInstance;
	revertSpy: jest.SpyInstance;
	logger: {
		error: jest.SpyInstance;
		info: jest.SpyInstance;
		notice: jest.SpyInstance;
		debug: jest.SpyInstance;
		warning: jest.SpyInstance;
	};
	getBlockRewardsSpy: jest.SpyInstance;
	getSentTransactionSpy: jest.SpyInstance;
	getRegisteredHandlersSpy: jest.SpyInstance;
	dispatchSpy: jest.SpyInstance;
	dispatchSyncSpy: jest.SpyInstance;
}

export interface Setup {
	sandbox: Sandbox;
	walletRepo: WalletRepository;
	walletRepoClone: WalletRepositoryClone;
	walletRepoCopyOnWrite: WalletRepositoryCopyOnWrite;
	factory: FactoryBuilder;
	blockState: BlockState;
	stateStore: StateStore;
	dPosState: DposState;
	dposPreviousRound: DposPreviousRoundStateProvider;
	stateBuilder: StateBuilder;
	transactionValidator: TransactionValidator;
	spies: Spies;
}

export const setUpDefaults = {
	getBlockRewards: [
		{
			generatorPublicKey: "03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37",
			rewards: BigNumber.make(10_000),
		},
	],
	getRegisteredHandlers: [],
	getSentTransaction: [
		{
			amount: BigNumber.make(22_222),
			fee: BigNumber.make(33_333),
			nonce: BigNumber.ONE,
			senderPublicKey: "03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece",
		},
	],
};

export const setUp = async (setUpOptions = setUpDefaults, skipBoot = false): Promise<Setup> => {
	const sandbox = new Sandbox();

	const logger = {
		debug: jest.fn(),
		error: jest.fn(),
		info: jest.fn(),
		notice: jest.fn(),
		warning: jest.fn(),
	};

	sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);

	sandbox.app.bind(Identifiers.WalletAttributes).to(Services.Attributes.AttributeSet).inSingletonScope();

	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("delegate");

	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("delegate.username");

	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("delegate.voteBalance");

	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("delegate.producedBlocks");

	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("delegate.forgedTotal");

	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("delegate.approval");

	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("vote");

	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("delegate.resigned");

	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("delegate.rank");

	sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("delegate.round");

	registerIndexers(sandbox.app);

	sandbox.app.bind(Identifiers.PluginConfiguration).to(Providers.PluginConfiguration).inSingletonScope();

	sandbox.app
		.get<PluginConfiguration>(Identifiers.PluginConfiguration)
		.set("storage.maxLastBlocks", defaults.storage.maxLastBlocks);

	sandbox.app
		.get<PluginConfiguration>(Identifiers.PluginConfiguration)
		.set("storage.maxLastTransactionIds", defaults.storage.maxLastTransactionIds);

	sandbox.app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();
	sandbox.app
		.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
		.bind("buildDelegateRanking", new BuildDelegateRankingAction());

	sandbox.app.bind(Identifiers.StateStore).to(StateStore).inSingletonScope();

	const stateStore: StateStore = sandbox.app.get(Identifiers.StateStore);

	const applySpy: jest.SpyInstance = jest.fn();
	const revertSpy: jest.SpyInstance = jest.fn();

	const getRegisteredHandlersSpy = jest.fn();

	@injectable()
	class MockHandler {
		public getActivatedHandlerForData() {
			return {
				apply: applySpy,
				revert: revertSpy,
			};
		}
		public getRegisteredHandlers() {
			getRegisteredHandlersSpy();
			return setUpOptions.getRegisteredHandlers;
		}
	}

	sandbox.app.bind(Identifiers.TransactionHandlerRegistry).to(MockHandler);

	const getBlockRewardsSpy = jest.fn();

	@injectable()
	class MockBlockRepository {
		public getBlockRewards() {
			getBlockRewardsSpy();
			return setUpOptions.getBlockRewards;
		}
	}

	const getSentTransactionSpy = jest.fn();

	@injectable()
	class MockTransactionRepository {
		public getSentTransactions() {
			getSentTransactionSpy();
			return setUpOptions.getSentTransaction;
		}
	}

	const dispatchSpy = jest.fn();
	const dispatchSyncSpy = jest.fn();

	@injectable()
	class MockEventDispatcher {
		public dispatch(data) {
			return dispatchSpy(data);
		}

		public dispatchSync(...data) {
			return dispatchSyncSpy(...data);
		}
	}

	sandbox.app.container.bind(Identifiers.DatabaseBlockRepository).to(MockBlockRepository);
	sandbox.app.container.bind(Identifiers.DatabaseTransactionRepository).to(MockTransactionRepository);
	sandbox.app.container.bind(Identifiers.EventDispatcherService).to(MockEventDispatcher);

	sandbox.app
		.bind(Identifiers.WalletRepository)
		.to(WalletRepository)
		.inSingletonScope()
		.when(Container.Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

	sandbox.app
		.bind(Identifiers.WalletFactory)
		.toFactory(({ container }) =>
			walletFactory(
				container.get(Identifiers.WalletAttributes),
				container.get(Identifiers.EventDispatcherService),
			),
		)
		.when(Container.Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

	sandbox.app
		.bind(Identifiers.WalletRepository)
		.to(WalletRepositoryClone)
		.inRequestScope()
		.when(Container.Selectors.anyAncestorOrTargetTaggedFirst("state", "clone"));

	sandbox.app
		.bind(Identifiers.WalletFactory)
		.toFactory(({ container }) => walletFactory(container.get(Identifiers.WalletAttributes)))
		.when(Container.Selectors.anyAncestorOrTargetTaggedFirst("state", "clone"));

	sandbox.app
		.bind(Identifiers.WalletRepository)
		.to(WalletRepositoryCopyOnWrite)
		.inRequestScope()
		.when(Container.Selectors.anyAncestorOrTargetTaggedFirst("state", "copy-on-write"));

	sandbox.app
		.bind(Identifiers.WalletFactory)
		.toFactory(({ container }) => walletFactory(container.get(Identifiers.WalletAttributes)))
		.when(Container.Selectors.anyAncestorOrTargetTaggedFirst("state", "copy-on-write"));

	const walletRepoClone: WalletRepositoryClone = sandbox.app.getTagged(
		Identifiers.WalletRepository,
		"state",
		"clone",
	);

	const walletRepo: WalletRepository = sandbox.app.getTagged(Identifiers.WalletRepository, "state", "blockchain");

	const walletRepoCopyOnWrite: WalletRepositoryCopyOnWrite = sandbox.app.getTagged(
		Identifiers.WalletRepository,
		"state",
		"copy-on-write",
	);

	sandbox.app.bind(Identifiers.BlockState).to(BlockState);

	sandbox.app
		.bind(Identifiers.DposState)
		.to(DposState)
		.inSingletonScope()
		.when(Container.Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

	sandbox.app
		.bind(Identifiers.DposState)
		.to(DposState)
		.inRequestScope()
		.when(Container.Selectors.anyAncestorOrTargetTaggedFirst("state", "clone"));

	sandbox.app
		.bind<DposPreviousRoundStateProvider>(Identifiers.DposPreviousRoundStateProvider)
		.toProvider(dposPreviousRoundStateProvider);

	const dposPreviousRound = sandbox.app.get<DposPreviousRoundStateProvider>(
		Identifiers.DposPreviousRoundStateProvider,
	);

	const blockState = sandbox.app.getTagged<BlockState>(Identifiers.BlockState, "state", "blockchain");

	const dPosState = sandbox.app.getTagged<DposState>(Identifiers.DposState, "state", "blockchain");

	sandbox.app.bind(Identifiers.TransactionValidator).to(TransactionValidator);

	const transactionValidator: TransactionValidator = sandbox.app.get(Identifiers.TransactionValidator);

	const stateBuilder = sandbox.app.resolve<StateBuilder>(StateBuilder);

	if (!skipBoot) {
		await sandbox.boot();

		// todo: get rid of the need for this, requires an instance based crypto package
		this.configuration.setConfig(
			sandbox.app.get<Services.Config.ConfigRepository>(Identifiers.ConfigRepository).get("crypto"),
		);
	}

	const factory = new FactoryBuilder();

	Factories.registerBlockFactory(factory);
	Factories.registerTransactionFactory(factory);
	Factories.registerWalletFactory(factory);

	return {
		blockState,
		dPosState,
		dposPreviousRound,
		factory,
		sandbox,
		spies: {
			applySpy,
			getBlockRewardsSpy,
			getRegisteredHandlersSpy,
			dispatchSpy,
			logger,
			dispatchSyncSpy,
			revertSpy,
			getSentTransactionSpy,
		},
		stateBuilder,
		stateStore,
		transactionValidator,
		walletRepo,
		walletRepoClone,
		walletRepoCopyOnWrite,
	};
};
