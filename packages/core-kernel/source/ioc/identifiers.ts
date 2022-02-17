export const Identifiers = {
	// Application
	Application: Symbol.for("Application<Instance>"),

	ApplicationDirPrefix: Symbol.for("Application<DirPrefix>"),

	ApplicationEnvironment: Symbol.for("Application<Environment>"),

	ApplicationNamespace: Symbol.for("Application<Namespace>"),

	ApplicationNetwork: Symbol.for("Application<Network>"),

	ApplicationToken: Symbol.for("Application<Token>"),

	ApplicationVersion: Symbol.for("Application<Version>"),

	// Managers
	CacheManager: Symbol.for("Manager<Cache>"),

	// Config
	ConfigFlags: Symbol.for("Config<Flags>"),

	ConfigManager: Symbol.for("Manager<Config>"),

	// Services
	BlockchainService: Symbol.for("Service<Blockchain>"),

	ConfigPlugins: Symbol.for("Config<Plugins>"),

	CacheService: Symbol.for("Service<Cache>"),

	// Crypto
	Crypto: Symbol.for("Crypto<NetworkConfig>"),

	ConfigService: Symbol.for("Service<Config>"),

	DatabaseManager: Symbol.for("Manager<Database>"),

	DatabaseService: Symbol.for("Service<Database>"),

	EventDispatcherManager: Symbol.for("Manager<EventDispatcher>"),

	EventDispatcherService: Symbol.for("Service<EventDispatcher>"),

	// Plugins
	PluginConfiguration: Symbol.for("PluginConfiguration"),

	FilesystemManager: Symbol.for("Manager<Filesystem>"),
	FilesystemService: Symbol.for("Service<Filesystem>"),
	ForgerService: Symbol.for("Service<Forger>"),
	LogManager: Symbol.for("Manager<Log>"),
	LogService: Symbol.for("Service<Log>"),
	ProcessActionsManager: Symbol.for("Manager<ProcessAction>"),
	MixinService: Symbol.for("Service<Mixin>"),
	QueueManager: Symbol.for("Manager<Queue>"),
	BlockHistoryService: Symbol.for("Service<BlockHistory>"),
	ValidationManager: Symbol.for("Manager<Validation>"),
	// Factories
	CacheFactory: Symbol.for("Factory<Cache>"),

	PaginationService: Symbol.for("Service<PaginationService>"),

	PeerFactory: Symbol.for("Factory<Peer>"),

	PipelineService: Symbol.for("Service<Pipeline>"),

	// Database
	DatabaseLogger: Symbol.for("Database<Logger>"),

	ProcessActionsService: Symbol.for("Service<ProcessActions>"),

	DatabaseConnection: Symbol.for("Database<Connection>"),

	QueueService: Symbol.for("Service<Queue>"),

	DatabaseBlockRepository: Symbol.for("Database<BlockRepository>"),

	ScheduleService: Symbol.for("Service<Schedule>"),

	DatabaseBlockFilter: Symbol.for("Database<BlockFilter>"),

	SnapshotService: Symbol.for("Service<Snapshot>"),

	DatabaseInteraction: Symbol.for("Database<DatabaseInteraction>"),

	StandardCriteriaService: Symbol.for("Service<StandardCriteriaService>"),

	// Kernel
	ConfigRepository: Symbol.for("Repository<Config>"),

	TriggerService: Symbol.for("Service<Actions>"),

	DatabaseModelConverter: Symbol.for("Database<ModelConverter>"),

	ValidationService: Symbol.for("Service<Validation>"),

	BlockProcessor: Symbol.for("Block<Processor>"),

	TransactionHistoryService: Symbol.for("Service<TransactionHistory>"),

	// State - @todo: better names that won't clash
	BlockState: Symbol.for("State<Block>"),

	PipelineFactory: Symbol.for("Factory<Pipeline>"),

	DatabaseRoundRepository: Symbol.for("Database<RoundRepository>"),

	QueueFactory: Symbol.for("Factory<Queue>"),

	DatabaseTransactionFilter: Symbol.for("Database<TransactionFilter>"),

	DatabaseTransactionRepository: Symbol.for("Database<TransactionRepository>"),

	DatabaseWalletsTableService: Symbol.for("Database<WalletsTableService>"),

	RoundState: Symbol.for("State<Round>"),

	ServiceProviderRepository: Symbol.for("Repository<ServiceProvider>"),

	StateBlockStore: Symbol.for("State<BlockStore>"),

	DatabaseInterceptor: Symbol.for("State<DatabaseInterceptor>"),

	StateBuilder: Symbol.for("State<StateBuilder>"),

	DposPreviousRoundStateProvider: Symbol("Provider<DposPreviousRoundState>"),
	// Blockchain
	StateMachine: Symbol.for("Blockchain<StateMachine>"),
	// Derived states
	DposState: Symbol.for("State<DposState>"),

	StateStore: Symbol.for("State<StateStore>"),

	PeerChunkCache: Symbol.for("Peer<ChunkCache>"),

	StateTransactionStore: Symbol.for("State<TransactionStore>"),

	// P2P - @todo: better names that won't clash
	PeerCommunicator: Symbol.for("Peer<Communicator>"),

	StateWalletSyncService: Symbol.for("State<WalletSyncService>"),

	PeerConnector: Symbol.for("Peer<Connector>"),

	TransactionValidator: Symbol.for("State<TransactionValidator>"),

	P2PServer: Symbol.for("Server<P2P>"),

	WalletFactory: Symbol.for("State<WalletFactory>"),

	PeerEventListener: Symbol.for("Peer<EventListener>"),
	WalletRepository: Symbol.for("Repository<Wallet>"),
	PeerNetworkMonitor: Symbol.for("Peer<NetworkMonitor>"),
	WalletRepositoryIndexerIndex: Symbol.for("IndexerIndex<Repository<Wallet>>"),
	PeerProcessor: Symbol.for("Peer<Processor>"),
	TransactionValidatorFactory: Symbol.for("State<TransactionValidatorFactory>"),
	PeerRepository: Symbol.for("Peer<Repository>"),
	PeerTransactionBroadcaster: Symbol.for("Peer<TransactionBroadcaster>"),

	TransactionPoolCleaner: Symbol.for("TransactionPool<Cleaner>"),

	TransactionPoolCollator: Symbol.for("TransactionPool<Collator>"),

	TransactionPoolDynamicFeeMatcher: Symbol.for("TransactionPool<DynamicFeeMatcher>"),

	TransactionPoolMempool: Symbol.for("TransactionPool<Mempool>"),

	TransactionPoolProcessor: Symbol.for("TransactionPool<Processor>"),

	TransactionPoolExpirationService: Symbol.for("TransactionPool<ExpirationService>"),

	TransactionPoolProcessorExtension: Symbol.for("TransactionPool<ProcessorExtension>"),

	TransactionPoolProcessorFactory: Symbol.for("TransactionPool<ProcessorFactory>"),

	TransactionPoolQuery: Symbol.for("TransactionPool<Query>"),

	TransactionPoolSenderMempool: Symbol.for("TransactionPool<SenderMempool>"),
	// Transaction Pool
	TransactionPoolService: Symbol.for("TransactionPool<Service>"),
	// TransactionHandler
	TransactionHandler: Symbol.for("TransactionHandler"),

	TransactionHandlerConstructors: Symbol.for("TransactionHandlerConstructors"),

	TransactionPoolStorage: Symbol.for("TransactionPool<Storage>"),

	TransactionHandlerProvider: Symbol.for("Provider<TransactionHandler>"),

	// Registries
	TransactionHandlerRegistry: Symbol.for("Registry<TransactionHandler>"),

	TransactionPoolSenderMempoolFactory: Symbol.for("TransactionPool<SenderMempoolFactory>"),

	TransactionPoolSenderState: Symbol.for("TransactionPool<SenderState>"),

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
