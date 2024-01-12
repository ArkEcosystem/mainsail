export const Identifiers = {
	ApiSync: Symbol.for("ApiSync<Sync>"),
	Application: {
		DirPrefix: Symbol.for("Application<DirPrefix>"),
		Environment: Symbol.for("Application<Environment>"),
		Instance: Symbol.for("Application<Instance>"),
		Name: Symbol.for("Application<Name>"),
		Namespace: Symbol.for("Application<Namespace>"),
		Network: Symbol.for("Application<Network>"),
		Token: Symbol.for("Application<Token>"),
		Version: Symbol.for("Application<Version>"),
	},
	BlockProcessor: Symbol.for("Block<Processor>"),
	BlockVerifier: Symbol.for("Block<Verifier>"),
	Consensus: {
		Aggregator: Symbol.for("Aggregator<Consensus>"),
		Bootstrapper: Symbol.for("Bootstrapper<Consensus>"),
		CommitLock: Symbol.for("CommitLock<Consensus>"),
		CommitProcessor: Symbol.for("Consensus<Commit.Processor>"),
		CommitStateFactory: Symbol.for("Consensus<CommitState.Factory>"),
		PrecommitProcessor: Symbol.for("Consensus<Precommit.Processor>"),
		PrevoteProcessor: Symbol.for("Consensus<Prevote.Processor>"),
		ProposalProcessor: Symbol.for("Consensus<Proposal.Processor>"),
		RoundStateRepository: Symbol.for("Repository<Consensus.RoundState>"),
		Scheduler: Symbol.for("Scheduler<Consensus>"),
		Service: Symbol.for("Service<Consensus>"),
		Storage: Symbol.for("Storage<Consensus>"),
		ValidatorRepository: Symbol.for("Repository<Consensus.Validator>"),
	},

	Crypto: Symbol.for("Crypto<NetworkConfig>"),
	Cryptography: {
		Block: {
			Deserializer: Symbol.for("Crypto<Block.Deserializer>"),
			Factory: Symbol.for("Crypto<Block.Factory>"),
			IDFactory: Symbol.for("Crypto<Block.IDFactory>"),
			Serializer: Symbol.for("Crypto<Block.Serializer>"),
			Verifier: Symbol.for("Crypto<Block.Verifier>"),
		},
		Commit: {
			Deserializer: Symbol.for("Crypto<Commit.Deserializer>"),
			Factory: Symbol.for("Crypto<Commit.Factory>"),
			Serializer: Symbol.for("Crypto<Commit.Serializer>"),
		},
		Configuration: Symbol.for("Crypto<Configuration>"),
		HashFactory: Symbol.for("Crypto<HashFactory>"),
		Identity: {
			AddressFactory: Symbol.for("Crypto<Identity.AddressFactory>"),
			AddressSerializer: Symbol.for("Crypto<Identity.AddressSerializer>"),
			KeyPairFactory: Symbol.for("Crypto<Identity.KeyPairFactory>"),
			PrivateKeyFactory: Symbol.for("Crypto<Identity.PrivateKeyFactory>"),
			PublicKeyFactory: Symbol.for("Crypto<Identity.PublicKeyFactory>"),
			PublicKeySerializer: Symbol.for("Crypto<Identity.PublicKeySerializer>"),
			WifFactory: Symbol.for("Crypto<Identity.WifFactory>"),
		},
		Message: {
			Deserializer: Symbol.for("Crypto<Message.Deserializer>"),
			Factory: Symbol.for("Crypto<Message.Factory>"),
			Serializer: Symbol.for("Crypto<Message.Serializer>"),
		},
		Serializer: Symbol.for("Crypto<Serializer>"),
		Signature: Symbol.for("Crypto<Signature>"),
		Size: {
			Address: Symbol.for("Crypto<Size.Address>"),
			HASH256: Symbol.for("Crypto<Size.HASH256>"),
			PublicKey: Symbol.for("Crypto<Size.PublicKey>"),
			RIPEMD160: Symbol.for("Crypto<Size.RIPEMD160>"),
			SHA256: Symbol.for("Crypto<Size.SHA256>"),
			Signature: Symbol.for("Crypto<Size.Signature>"),
		},
		Transaction: {
			Deserializer: Symbol.for("Crypto<Transaction.Deserializer>"),
			Factory: Symbol.for("Crypto<Transaction.Factory>"),
			Registry: Symbol.for("Crypto<Transaction.Registry>"),
			Serializer: Symbol.for("Crypto<Transaction.Serializer>"),
			Signer: Symbol.for("Crypto<Transaction.Signer>"),
			TypeFactory: Symbol.for("Crypto<Transaction.TypeFactory>"),
			Utils: Symbol.for("Crypto<Transaction.Utils>"),
			Verifier: Symbol.for("Crypto<Transaction.Verifier>"),
		},
		Validator: Symbol.for("Crypto<Validator>"),
	},
	Database: {
		BlockStorage: Symbol.for("Database<BlockStorage>"),
		ConsensusStateStorage: Symbol.for("Database<ConsensusStateStorage>"),
		ConsensusStorage: Symbol.for("Database<ConsensusStorage>"),
		PrecommitStorage: Symbol.for("Database<PrecommitStorage>"),
		PrevoteStorage: Symbol.for("Database<PrevoteStorage>"),
		ProposalStorage: Symbol.for("Database<ProposalStorage>"),
		RootStorage: Symbol.for("Database<RootStorage>"),
		Service: Symbol.for("Database<Service>"),
	},
	Fee: {
		Matcher: Symbol.for("Fee<Matcher>"),
		Registry: Symbol.for("Fee<Registry>"),
		Type: Symbol.for("Fee<Type>"),
	},

	Ipc: {
		Worker: Symbol.for("Ipc<Worker>"),
		WorkerFactory: Symbol.for("Ipc<WorkerFactory>"),
		WorkerPool: Symbol.for("Ipc<WorkerPool>"),
		WorkerSubprocessFactory: Symbol.for("Ipc<WorkerSubprocessFactory>"),
	},
	Kernel: {
		Cache: {
			Factory: Symbol.for("Kernel<Cache.Factory>"),
			Manager: Symbol.for("Kernel<Cache.Manager>"),
		},
		Config: {
			Flags: Symbol.for("Kernel<Config.Flags>"),
			Manager: Symbol.for("Kernel<Config.Manager>"),
			Plugins: Symbol.for("Kernel<Config.Plugins>"),
			Repository: Symbol.for("Kernel<Config.Repository>"),
		},
		EventDispatcher: {
			Manager: Symbol.for("Kernel<EventDispatcher.Manager>"),
			Service: Symbol.for("Kernel<EventDispatcher.Service>"),
		},
		Filesystem: {
			Manager: Symbol.for("Kernel<Filesystem.Manager>"),
			Service: Symbol.for("Kernel<Filesystem.Service>"),
		},
		Log: {
			Manager: Symbol.for("Kernel<Log.Manager>"),
			Service: Symbol.for("Kernel<Log.Service>"),
		},
		Mixin: {
			Service: Symbol.for("Kernel<Mixin.Service>"),
		},
		ProcessActions: {
			Manager: Symbol.for("Kernel<ProcessActions.Manager>"),
			Service: Symbol.for("Kernel<ProcessActions.Service>"),
		},
		Queue: {
			Factory: Symbol.for("Kernel<Queue.Factory>"),
			Manager: Symbol.for("Kernel<Queue.Manager>"),
		},
		Validation: {
			Manager: Symbol.for("Kernel<Validation.Manager>"),
			Service: Symbol.for("Kernel<Validation.Service>"),
		},
	},
	P2P: {
		Server: Symbol.for("P2P<Server>"),
		Service: Symbol.for("P2P<Service>"),
	},
	P2PLogger: Symbol.for("Logger<P2P>"),
	P2PServer: Symbol.for("Server<P2P>"),
	P2PState: Symbol.for("State<P2P>"),
	PeerApiNodeDiscoverer: Symbol.for("Peer<Discoverer.ApiNodes>"),
	PeerApiNodeFactory: Symbol.for("Peer<Factory.ApiNodes>"),
	PeerApiNodeProcessor: Symbol.for("Peer<Processor.ApiNodes>"),
	PeerApiNodeRepository: Symbol.for("Peer<Repository.ApiNodes>"),
	PeerApiNodeVerifier: Symbol.for("Peer<Verifier.ApiNodes>"),
	PeerBlockDownloader: Symbol.for("Peer<BlockDownloader>"),
	PeerBroadcaster: Symbol.for("Peer<Broadcaster>"),
	PeerCommunicator: Symbol.for("Peer<Communicator>"),
	PeerConnector: Symbol.for("Peer<Connector>"),
	PeerDiscoverer: Symbol.for("Peer<Discoverer>"),
	PeerDisposer: Symbol.for("Peer<Disposer>"),
	PeerFactory: Symbol.for("Factory<Peer>"),
	PeerHeaderFactory: Symbol.for("Factory<PeerHeader>"),
	PeerHeaderService: Symbol.for("Peer<HeaderService>"),
	PeerMessageDownloader: Symbol.for("Peer<Downloader>"),
	PeerProcessor: Symbol.for("Peer<Processor>"),
	PeerProposalDownloader: Symbol.for("Peer<ProposalDownloader>"),
	PeerRepository: Symbol.for("Peer<Repository>"),
	PeerThrottleFactory: Symbol.for("Peer<Throttle.Factory>"),
	PeerVerifier: Symbol.for("Peer<Verifier>"),
	PipelineFactory: Symbol.for("Factory<Pipeline>"),
	PipelineService: Symbol.for("Service<Pipeline>"),
	PluginConfiguration: Symbol.for("PluginConfiguration"),
	Proposer: {
		Selector: Symbol.for("Proposer<Selector>"),
	},
	ScheduleService: Symbol.for("Service<Schedule>"),
	ServiceProviderRepository: Symbol.for("Repository<ServiceProvider>"),
	SnapshotService: Symbol.for("Service<Snapshot>"),
	StandardCriteriaService: Symbol.for("Service<StandardCriteriaService>"),
	State: {
		ValidatorMutator: Symbol.for("State<ValidatorMutator>"),
	},
	StateAttributes: Symbol.for("Attributes<State>"),
	StateExporter: Symbol.for("State<Exporter>"),
	StateImporter: Symbol.for("State<Importer>"),
	StateService: Symbol.for("State<Service>"),
	StateStoreFactory: Symbol.for("State<Factory<StateStore>>"),
	StateVerifier: Symbol.for("State<Verifier>"),
	TransactionHandler: Symbol.for("TransactionHandler"),
	TransactionHandlerConstructors: Symbol.for("TransactionHandlerConstructors"),
	TransactionHandlerProvider: Symbol.for("Provider<TransactionHandler>"),
	TransactionHandlerRegistry: Symbol.for("Registry<TransactionHandler>"),
	TransactionHistoryService: Symbol.for("Service<TransactionHistory>"),
	TransactionPool: {
		Collator: Symbol.for("TransactionPool<Collator>"),
		ExpirationService: Symbol.for("TransactionPool<ExpirationService>"),
		Mempool: Symbol.for("TransactionPool<Mempool>"),
		Processor: Symbol.for("TransactionPool<Processor>"),
		ProcessorExtension: Symbol.for("TransactionPool<ProcessorExtension>"),
		ProcessorFactory: Symbol.for("TransactionPool<ProcessorFactory>"),
		Query: Symbol.for("TransactionPool<Query>"),
		SenderMempoolFactory: Symbol.for("TransactionPool<SenderMempoolFactory>"),
		SenderState: Symbol.for("TransactionPool<SenderState>"),
		Service: Symbol.for("TransactionPool<Service>"),
		Storage: Symbol.for("TransactionPool<Storage>"),
	},
	TransactionProcessor: Symbol.for("Transaction<Processor>"),
	TransactionValidator: Symbol.for("State<TransactionValidator>"),
	TransactionValidatorFactory: Symbol.for("State<TransactionValidatorFactory>"),
	TriggerService: Symbol.for("Service<Actions>"),
	ValidatorSet: Symbol.for("Set<ValidatorSet>"),
	ValidatorWalletFactory: Symbol.for("State<ValidatorWalletFactory>"),
	WalletAttributes: Symbol.for("Attributes<Wallet>"),
	WalletFactory: Symbol.for("State<WalletFactory>"),
	WalletRepositoryCloneFactory: Symbol.for("Factory<Repository<Clone<Wallet>>>"),
	WalletRepositoryCopyOnWriteFactory: Symbol.for("Factory<Repository<CopyOnWrite<Wallet>>>"),
	WalletRepositoryFactory: Symbol.for("Factory<Repository<Wallet>>"),
	WalletRepositoryIndexSet: Symbol.for("IndexSet<Repository<Wallet>>"),
};
