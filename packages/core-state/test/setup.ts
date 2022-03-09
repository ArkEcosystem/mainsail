import { walletFactory } from "../source/wallets/wallet-factory";
import { Container, Providers, Services, Contracts } from "@arkecosystem/core-kernel";
import { dposPreviousRoundStateProvider } from "../source";
import { BuildDelegateRankingAction } from "../source/actions";
import { BlockState } from "../source/block-state";
import { defaults } from "../source/defaults";
import { DposState } from "../source/dpos/dpos";
import { StateBuilder } from "../source/state-builder";
import { StateStore } from "../source/stores/state";
import { TransactionValidator } from "../source/transaction-validator";
import { WalletRepository, WalletRepositoryClone, WalletRepositoryCopyOnWrite } from "../source/wallets";
import { registerIndexers } from "../source/wallets/indexers";
import { Sandbox, Factories } from "@arkecosystem/core-test-framework";
import { Managers, Utils } from "@arkecosystem/crypto";
import { SinonSpy, spy } from "sinon";

export interface Spies {
	applySpy: SinonSpy;
	revertSpy: SinonSpy;
	logger: {
		error: SinonSpy;
		info: SinonSpy;
		notice: SinonSpy;
		debug: SinonSpy;
		warning: SinonSpy;
	};
	getBlockRewardsSpy: SinonSpy;
	getSentTransactionSpy: SinonSpy;
	getRegisteredHandlersSpy: SinonSpy;
	dispatchSpy: SinonSpy;
	dispatchSyncSpy: SinonSpy;
}

export interface Setup {
	sandbox: Sandbox;
	walletRepo: WalletRepository;
	walletRepoClone: WalletRepositoryClone;
	walletRepoCopyOnWrite: WalletRepositoryCopyOnWrite;
	factory: Factories.FactoryBuilder;
	blockState: BlockState;
	stateStore: StateStore;
	dPosState: DposState;
	dposPreviousRound: Contracts.State.DposPreviousRoundStateProvider;
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
		error: spy(),
		info: spy(),
		notice: spy(),
		debug: spy(),
		warning: spy(),
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
		.get<Providers.PluginConfiguration>(Container.Identifiers.PluginConfiguration)
		.set("storage.maxLastBlocks", defaults.storage.maxLastBlocks);

	sandbox.app
		.get<Providers.PluginConfiguration>(Container.Identifiers.PluginConfiguration)
		.set("storage.maxLastTransactionIds", defaults.storage.maxLastTransactionIds);

	sandbox.app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();
	sandbox.app
		.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
		.bind("buildDelegateRanking", new BuildDelegateRankingAction());

	sandbox.app.bind(Identifiers.StateStore).to(StateStore).inSingletonScope();

	const stateStore: StateStore = sandbox.app.get(Identifiers.StateStore);

	const applySpy: SinonSpy = spy();
	const revertSpy: SinonSpy = spy();

	const getRegisteredHandlersSpy = spy();

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

	const getBlockRewardsSpy = spy();

	@injectable()
	class MockBlockRepository {
		public getBlockRewards() {
			getBlockRewardsSpy();
			return setUpOptions.getBlockRewards;
		}
	}

	const getSentTransactionSpy = spy();

	@injectable()
	class MockTransactionRepository {
		public getSentTransactions() {
			getSentTransactionSpy();
			return setUpOptions.getSentTransaction;
		}
	}

	const dispatchSpy = spy();
	const dispatchSyncSpy = spy();

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
		.bind<Contracts.State.DposPreviousRoundStateProvider>(Container.Identifiers.DposPreviousRoundStateProvider)
		.toProvider(dposPreviousRoundStateProvider);

	const dposPreviousRound = sandbox.app.get<Contracts.State.DposPreviousRoundStateProvider>(
		Container.Identifiers.DposPreviousRoundStateProvider,
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

	const factory = new Factories.FactoryBuilder();

	Factories.Factories.registerBlockFactory(factory);
	Factories.Factories.registerTransactionFactory(factory);
	Factories.Factories.registerWalletFactory(factory);

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
