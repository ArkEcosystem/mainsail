export const Identifiers = {
	DataSource: Symbol.for("API<DatabSource>"),

	BlockRepository: Symbol.for("API<BlockRepository>"),
	BlockRepositoryFactory: Symbol.for("API<Factory.BlockRepository>"),

	TransactionRepository: Symbol.for("API<TransactionRepository>"),
	TransactionRepositoryFactory: Symbol.for("API<Factory.TransactionRepositoryFactory>"),

	ValidatorRoundRepository: Symbol.for("API<ValidatorRoundRepository>"),
	ValidatorRoundRepositoryFactory: Symbol.for("API<Factory.ValidatorRoundRepositoryFactory>"),

	WalletRepository: Symbol.for("API<WalletRepository>"),
	WalletRepositoryFactory: Symbol.for("API<Factory.WalletRepositoryFactory>"),
};
