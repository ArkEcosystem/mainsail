export const Identifiers = {
	// Application
	Application: Symbol.for("Application<Instance>"),

	ApplicationDirPrefix: Symbol.for("Application<DirPrefix>"),

	ApplicationEnvironment: Symbol.for("Application<Environment>"),

	ApplicationNamespace: Symbol.for("Application<Namespace>"),

	ApplicationNetwork: Symbol.for("Application<Network>"),

	ApplicationToken: Symbol.for("Application<Token>"),

	ApplicationVersion: Symbol.for("Application<Version>"),

	// Services
	BlockchainService: Symbol.for("Service<Blockchain>"),

	// Managers
	CacheManager: Symbol.for("Manager<Cache>"),

	CacheService: Symbol.for("Service<Cache>"),

	// Config
	ConfigFlags: Symbol.for("Config<Flags>"),

	ConfigManager: Symbol.for("Manager<Config>"),

	ConfigPlugins: Symbol.for("Config<Plugins>"),

	ConfigService: Symbol.for("Service<Config>"),

	// Crypto
	Crypto: Symbol.for("Crypto<NetworkConfig>"),

	DatabaseManager: Symbol.for("Manager<Database>"),

	DatabaseService: Symbol.for("Service<Database>"),

	BlockHistoryService: Symbol.for("Service<BlockHistory>"),

	EventDispatcherManager: Symbol.for("Manager<EventDispatcher>"),

	// Factories
	CacheFactory: Symbol.for("Factory<Cache>"),

	EventDispatcherService: Symbol.for("Service<EventDispatcher>"),

	FilesystemManager: Symbol.for("Manager<Filesystem>"),

	FilesystemService: Symbol.for("Service<Filesystem>"),

	// Database
	DatabaseLogger: Symbol.for("Database<Logger>"),

	ForgerService: Symbol.for("Service<Forger>"),

	DatabaseConnection: Symbol.for("Database<Connection>"),

	LogManager: Symbol.for("Manager<Log>"),

	DatabaseBlockRepository: Symbol.for("Database<BlockRepository>"),

	LogService: Symbol.for("Service<Log>"),

	DatabaseBlockFilter: Symbol.for("Database<BlockFilter>"),

	// Plugins
	PluginConfiguration: Symbol.for("PluginConfiguration"),

	DatabaseInteraction: Symbol.for("Database<DatabaseInteraction>"),

	MixinService: Symbol.for("Service<Mixin>"),

	// Kernel
	ConfigRepository: Symbol.for("Repository<Config>"),

	PaginationService: Symbol.for("Service<PaginationService>"),

	DatabaseModelConverter: Symbol.for("Database<ModelConverter>"),

	ProcessActionsManager: Symbol.for("Manager<ProcessAction>"),

	BlockProcessor: Symbol.for("Block<Processor>"),

	QueueManager: Symbol.for("Manager<Queue>"),

	// State - @todo: better names that won't clash
	BlockState: Symbol.for("State<Block>"),

	ValidationManager: Symbol.for("Manager<Validation>"),

	DatabaseRoundRepository: Symbol.for("Database<RoundRepository>"),

	PeerFactory: Symbol.for("Factory<Peer>"),

	DatabaseTransactionFilter: Symbol.for("Database<TransactionFilter>"),

	PipelineService: Symbol.for("Service<Pipeline>"),

	DatabaseTransactionRepository: Symbol.for("Database<TransactionRepository>"),

	ProcessActionsService: Symbol.for("Service<ProcessActions>"),

	DatabaseWalletsTableService: Symbol.for("Database<WalletsTableService>"),

	QueueService: Symbol.for("Service<Queue>"),

	DatabaseInterceptor: Symbol.for("State<DatabaseInterceptor>"),

	ScheduleService: Symbol.for("Service<Schedule>"),

	DposPreviousRoundStateProvider: Symbol("Provider<DposPreviousRoundState>"),

	SnapshotService: Symbol.for("Service<Snapshot>"),

	// Derived states
	DposState: Symbol.for("State<DposState>"),

	StandardCriteriaService: Symbol.for("Service<StandardCriteriaService>"),

	PeerChunkCache: Symbol.for("Peer<ChunkCache>"),

	TriggerService: Symbol.for("Service<Actions>"),

	// P2P - @todo: better names that won't clash
	PeerCommunicator: Symbol.for("Peer<Communicator>"),

	ValidationService: Symbol.for("Service<Validation>"),

	PeerConnector: Symbol.for("Peer<Connector>"),

	TransactionHistoryService: Symbol.for("Service<TransactionHistory>"),

	P2PServer: Symbol.for("Server<P2P>"),

	PipelineFactory: Symbol.for("Factory<Pipeline>"),

	PeerEventListener: Symbol.for("Peer<EventListener>"),

	QueueFactory: Symbol.for("Factory<Queue>"),

	PeerNetworkMonitor: Symbol.for("Peer<NetworkMonitor>"),

	RoundState: Symbol.for("State<Round>"),

	PeerProcessor: Symbol.for("Peer<Processor>"),

	ServiceProviderRepository: Symbol.for("Repository<ServiceProvider>"),

	PeerRepository: Symbol.for("Peer<Repository>"),

	StateBlockStore: Symbol.for("State<BlockStore>"),

	PeerTransactionBroadcaster: Symbol.for("Peer<TransactionBroadcaster>"),

	StateBuilder: Symbol.for("State<StateBuilder>"),

	// Blockchain
	StateMachine: Symbol.for("Blockchain<StateMachine>"),

	StateStore: Symbol.for("State<StateStore>"),
	StateTransactionStore: Symbol.for("State<TransactionStore>"),
	StateWalletSyncService: Symbol.for("State<WalletSyncService>"),
	TransactionPoolCleaner: Symbol.for("TransactionPool<Cleaner>"),
	TransactionPoolCollator: Symbol.for("TransactionPool<Collator>"),
	TransactionPoolExpirationService: Symbol.for("TransactionPool<ExpirationService>"),
	TransactionPoolMempool: Symbol.for("TransactionPool<Mempool>"),

	TransactionValidator: Symbol.for("State<TransactionValidator>"),

	// TransactionHandler
	TransactionHandler: Symbol.for("TransactionHandler"),

	WalletFactory: Symbol.for("State<WalletFactory>"),

	TransactionHandlerConstructors: Symbol.for("TransactionHandlerConstructors"),

	WalletRepository: Symbol.for("Repository<Wallet>"),

	TransactionHandlerProvider: Symbol.for("Provider<TransactionHandler>"),

	WalletRepositoryIndexerIndex: Symbol.for("IndexerIndex<Repository<Wallet>>"),

	// Registries
	TransactionHandlerRegistry: Symbol.for("Registry<TransactionHandler>"),

	TransactionValidatorFactory: Symbol.for("State<TransactionValidatorFactory>"),

	TransactionPoolProcessor: Symbol.for("TransactionPool<Processor>"),

	TransactionPoolProcessorExtension: Symbol.for("TransactionPool<ProcessorExtension>"),

	TransactionPoolProcessorFactory: Symbol.for("TransactionPool<ProcessorFactory>"),

	TransactionPoolQuery: Symbol.for("TransactionPool<Query>"),

	TransactionPoolSenderMempool: Symbol.for("TransactionPool<SenderMempool>"),

	Fee: {
		Registry: Symbol.for("Fee<Registry>"),
		Matcher: Symbol.for("Fee<Matcher>"),
	},

	TransactionPoolSenderMempoolFactory: Symbol.for("TransactionPool<SenderMempoolFactory>"),

	TransactionPoolSenderState: Symbol.for("TransactionPool<SenderState>"),

	// Transaction Pool
	TransactionPoolService: Symbol.for("TransactionPool<Service>"),

	TransactionPoolStorage: Symbol.for("TransactionPool<Storage>"),

	TransactionPoolWorker: Symbol.for("TransactionPool<Worker>"),

	TransactionPoolWorkerFactory: Symbol.for("TransactionPool<WorkerFactory>"),

	TransactionPoolWorkerIpcSubprocessFactory: Symbol.for("TransactionPool<WorkerIpcSubprocessFactory>"),

	TransactionPoolWorkerPool: Symbol.for("TransactionPool<WorkerPool>"),

	// Transactions - @todo: better names that won't clash
	WalletAttributes: Symbol.for("Wallet<Attributes>"),

	WatcherDatabaseService: Symbol.for("Watcher<DatabaseService>"),
	// Watcher
	WatcherEventListener: Symbol.for("Watcher<EventListener>"),
};
