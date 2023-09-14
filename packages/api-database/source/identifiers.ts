export const Identifiers = {
	BlockRepository: Symbol.for("API<BlockRepository>"),

	BlockRepositoryFactory: Symbol.for("API<Factory.BlockRepository>"),
	DataSource: Symbol.for("API<DatabSource>"),

	MempoolTransactionRepository: Symbol.for("API<MempoolTransactionRepository>"),
	MempoolTransactionRepositoryFactory: Symbol.for("API<Factory.MempoolTransactionRepositoryFactory>"),

	PeerRepository: Symbol.for("API<PeerRepository>"),
	PeerRepositoryFactory: Symbol.for("API<Factory.PeerRepositoryFactory>"),

	TransactionRepository: Symbol.for("API<TransactionRepository>"),
	TransactionRepositoryFactory: Symbol.for("API<Factory.TransactionRepositoryFactory>"),

	ValidatorRoundRepository: Symbol.for("API<ValidatorRoundRepository>"),
	ValidatorRoundRepositoryFactory: Symbol.for("API<Factory.ValidatorRoundRepositoryFactory>"),

	WalletRepository: Symbol.for("API<WalletRepository>"),
	WalletRepositoryFactory: Symbol.for("API<Factory.WalletRepositoryFactory>"),
};
