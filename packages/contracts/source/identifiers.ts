export const Identifiers = {
	ApiSync: {
		Listener: Symbol("ApiSync<Listener>"),
		Service: Symbol("ApiSync<Service>"),
	},
	Application: {
		DirPrefix: Symbol("Application<DirPrefix>"),
		Environment: Symbol("Application<Environment>"),
		Instance: Symbol("Application<Instance>"),
		Name: Symbol("Application<Name>"),
		Namespace: Symbol("Application<Namespace>"),
		Network: Symbol("Application<Network>"),
		Token: Symbol("Application<Token>"),
		Version: Symbol("Application<Version>"),
	},
	Config: {
		Flags: Symbol("Config<Flags>"),
		Plugins: Symbol("Config<Plugins>"),
		Repository: Symbol("Config<Repository>"),
	},
	Consensus: {
		Aggregator: Symbol("Aggregator<Consensus>"),
		Bootstrapper: Symbol("Bootstrapper<Consensus>"),
		CommitLock: Symbol("CommitLock<Consensus>"),
		CommitProcessor: Symbol("Consensus<Commit.Processor>"),
		CommitStateFactory: Symbol("Consensus<CommitState.Factory>"),
		PrecommitProcessor: Symbol("Consensus<Precommit.Processor>"),
		PrevoteProcessor: Symbol("Consensus<Prevote.Processor>"),
		ProposalProcessor: Symbol("Consensus<Proposal.Processor>"),
		RoundStateRepository: Symbol("Repository<Consensus.RoundState>"),
		Scheduler: Symbol("Scheduler<Consensus>"),
		Service: Symbol("Service<Consensus>"),
		Storage: Symbol("Storage<Consensus>"),
		ValidatorRepository: Symbol("Repository<Consensus.Validator>"),
	},
	CryptoWorker: {
		Worker: Symbol("Ipc<Worker>"),
		WorkerFactory: Symbol("Ipc<WorkerFactory>"),
		WorkerPool: Symbol("Ipc<WorkerPool>"),
		WorkerSubprocessFactory: Symbol("Ipc<WorkerSubprocessFactory>"),
	},
	Cryptography: {
		Block: {
			Deserializer: Symbol("Crypto<Block.Deserializer>"),
			Factory: Symbol("Crypto<Block.Factory>"),
			IDFactory: Symbol("Crypto<Block.IDFactory>"),
			Serializer: Symbol("Crypto<Block.Serializer>"),
			Verifier: Symbol("Crypto<Block.Verifier>"),
		},
		Commit: {
			Deserializer: Symbol("Crypto<Commit.Deserializer>"),
			Factory: Symbol("Crypto<Commit.Factory>"),
			Serializer: Symbol("Crypto<Commit.Serializer>"),
		},
		Configuration: Symbol("Crypto<Configuration>"),
		HashFactory: Symbol("Crypto<HashFactory>"),
		Identity: {
			AddressFactory: Symbol("Crypto<Identity.AddressFactory>"),
			AddressSerializer: Symbol("Crypto<Identity.AddressSerializer>"),
			KeyPairFactory: Symbol("Crypto<Identity.KeyPairFactory>"),
			PrivateKeyFactory: Symbol("Crypto<Identity.PrivateKeyFactory>"),
			PublicKeyFactory: Symbol("Crypto<Identity.PublicKeyFactory>"),
			PublicKeySerializer: Symbol("Crypto<Identity.PublicKeySerializer>"),
			WifFactory: Symbol("Crypto<Identity.WifFactory>"),
		},
		Message: {
			Deserializer: Symbol("Crypto<Message.Deserializer>"),
			Factory: Symbol("Crypto<Message.Factory>"),
			Serializer: Symbol("Crypto<Message.Serializer>"),
		},
		Serializer: Symbol("Crypto<Serializer>"),
		Signature: Symbol("Crypto<Signature>"),
		Size: {
			Address: Symbol("Crypto<Size.Address>"),
			HASH256: Symbol("Crypto<Size.HASH256>"),
			PublicKey: Symbol("Crypto<Size.PublicKey>"),
			RIPEMD160: Symbol("Crypto<Size.RIPEMD160>"),
			SHA256: Symbol("Crypto<Size.SHA256>"),
			Signature: Symbol("Crypto<Size.Signature>"),
		},
		Transaction: {
			Deserializer: Symbol("Crypto<Transaction.Deserializer>"),
			Factory: Symbol("Crypto<Transaction.Factory>"),
			Registry: Symbol("Crypto<Transaction.Registry>"),
			Serializer: Symbol("Crypto<Transaction.Serializer>"),
			Signer: Symbol("Crypto<Transaction.Signer>"),
			TypeFactory: Symbol("Crypto<Transaction.TypeFactory>"),
			Utils: Symbol("Crypto<Transaction.Utils>"),
			Verifier: Symbol("Crypto<Transaction.Verifier>"),
		},
		Validator: Symbol("Crypto<Validator>"),
	},
	Database: {
		Instance: {
			Consensus: Symbol("Database<Instance.Consensus>"),
			Root: Symbol("Database<Instance.Root>"),
		},
		Service: Symbol("Database<Service>"),
		Storage: {
			Block: Symbol("Database<Storage.Block>"),
			ConsensusState: Symbol("Database<Storage.ConsensusState>"),
			Precommit: Symbol("Database<Storage.Precommit>"),
			Prevote: Symbol("Database<Storage.Prevote>"),
			Proposal: Symbol("Database<Storage.Proposal>"),
		},
	},
	Fee: {
		Matcher: Symbol("Fee<Matcher>"),
		Registry: Symbol("Fee<Registry>"),
		Type: Symbol("Fee<Type>"),
	},
	P2P: {
		ApiNode: {
			Discoverer: Symbol("P2P<ApiNode.Discoverer>"),
			Factory: Symbol("P2P<ApiNode.Factory>"),
			Processor: Symbol("P2P<ApiNode.Processor>"),
			Repository: Symbol("P2P<ApiNode.Repository>"),
			Verifier: Symbol("P2P<ApiNode.Verifier>"),
		},
		Broadcaster: Symbol("P2P<Broadcaster>"),
		Downloader: {
			Block: Symbol("P2P<Downloader.Block>"),
			Message: Symbol("P2P<Downloader.Message>"),
			Proposal: Symbol("P2P<Downloader.Proposal>"),
		},
		Header: {
			Factory: Symbol("P2P<Header.Factory>"),
			Service: Symbol("P2P<Header.Service>"),
		},
		Logger: Symbol("P2P<Logger>"),
		Peer: {
			Communicator: Symbol("P2P<Communicator>"),
			Connector: Symbol("P2P<Connector>"),
			Discoverer: Symbol("P2P<Peer.Discoverer>"),
			Disposer: Symbol("P2P<Peer.Disposer>"),
			Factory: Symbol("P2P<Peer.Factory>"),
			Processor: Symbol("P2P<Processor>"),
			Repository: Symbol("P2P<Peer.Repository>"),
			Verifier: Symbol("P2P<Verifier>"),
		},
		Server: Symbol("P2P<Server>"),
		Service: Symbol("P2P<Service>"),
		State: Symbol("P2P<State>"),
		Throttle: {
			Factory: Symbol("P2P<Throttle.Factory>"),
		},
	},

	Processor: {
		BlockProcessor: Symbol("Processor<Block.Processor>"),
		BlockVerifier: Symbol("Processor<Block.Verifier>"),
		TransactionProcessor: Symbol("Processor<Transaction.Processor>"),
	},
	Proposer: {
		Selector: Symbol("Proposer<Selector>"),
	},
	Providers: {
		ServiceProviderRepository: Symbol("Repository<ServiceProvider>"),
	},
	ServiceProvider: {
		Configuration: Symbol("ServiceProvider<Configuration>"),
		Repository: Symbol("ServiceProvider<Repository>"),
	},
	Services: {
		Cache: {
			Factory: Symbol("Kernel<Cache.Factory>"),
			Manager: Symbol("Kernel<Cache.Manager>"),
		},
		Config: {
			Manager: Symbol("Kernel<Config.Manager>"),
		},
		EventDispatcher: {
			Manager: Symbol("Kernel<EventDispatcher.Manager>"),
			Service: Symbol("Kernel<EventDispatcher.Service>"),
		},
		Filesystem: {
			Manager: Symbol("Kernel<Filesystem.Manager>"),
			Service: Symbol("Kernel<Filesystem.Service>"),
		},
		Log: {
			Manager: Symbol("Kernel<Log.Manager>"),
			Service: Symbol("Kernel<Log.Service>"),
		},
		Mixin: {
			Service: Symbol("Kernel<Mixin.Service>"),
		},
		Pipeline: {
			Factory: Symbol("Kernel<Pipeline.Factory>"),
		},
		ProcessActions: {
			Manager: Symbol("Kernel<ProcessActions.Manager>"),
			Service: Symbol("Kernel<ProcessActions.Service>"),
		},
		Queue: {
			Factory: Symbol("Kernel<Queue.Factory>"),
			Manager: Symbol("Kernel<Queue.Manager>"),
		},
		Schedule: {
			Service: Symbol("Kernel<Schedule.Service>"),
		},
		Trigger: {
			Service: Symbol("Kernel<Trigger.Service>"),
		},
		Validation: {
			Manager: Symbol("Kernel<Validation.Manager>"),
			Service: Symbol("Kernel<Validation.Service>"),
		},
	},
	State: {
		AttributeRepository: Symbol("State<AttributeRepository>"),
		Exporter: Symbol("State<Exporter>"),
		Importer: Symbol("State<Importer>"),
		Service: Symbol("State<Service>"),
		Store: {
			Factory: Symbol("State<Store<Factory>>"),
		},
		ValidatorMutator: Symbol("State<ValidatorMutator>"),
		ValidatorWallet: {
			Factory: Symbol("State<ValidatorWallet<Factory>>"),
		},
		Verifier: Symbol("State<Verifier>"),
		Wallet: {
			Attributes: Symbol("State<Wallet<Attributes>>"),
			Factory: Symbol("State<Wallet<Factory>>"),
		},
		WalletRepository: {
			Base: {
				Factory: Symbol("State<WalletRepository<Base<Factory>>>"),
			},
			BySender: {
				Factory: Symbol("State<WalletRepository<BySender<Factory>>>"),
			},
			Clone: {
				Factory: Symbol("State<WalletRepository<Clone<Factory>>>"),
			},
			IndexSet: Symbol("State<WalletRepository<IndexSet>>"),
		},
	},
	Transaction: {
		Handler: {
			Constructors: Symbol("Transaction<Handler.Constructors>"),
			Instances: Symbol("Transaction<Handler.Instances>"),
			Provider: Symbol("Transaction<Handler.Provider>"),
			Registry: Symbol("Transaction<Handler.Registry>"),
		},
	},
	TransactionPool: {
		Collator: Symbol("TransactionPool<Collator>"),
		ExpirationService: Symbol("TransactionPool<ExpirationService>"),
		Mempool: Symbol("TransactionPool<Mempool>"),
		Processor: Symbol("TransactionPool<Processor>"),
		ProcessorExtension: Symbol("TransactionPool<ProcessorExtension>"),
		Query: Symbol("TransactionPool<Query>"),
		SenderMempool: {
			Factory: Symbol("TransactionPool<SenderMempool.Factory>"),
		},
		SenderState: Symbol("TransactionPool<SenderState>"),
		Service: Symbol("TransactionPool<Service>"),
		Storage: Symbol("TransactionPool<Storage>"),
		TransactionValidator: {
			Factory: Symbol("TransactionPool<TransactionValidator.Factory>"),
			Instance: Symbol("TransactionPool<TransactionValidator.Instance>"),
		},
	},
	ValidatorSet: {
		Service: Symbol("ValidatorSet<Service>"),
	},
};
