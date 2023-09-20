export const Identifiers = {
	DataSource: Symbol.for("API<DatabSource>"),

	BlockRepositoryFactory: Symbol.for("API<Factory.BlockRepository>"),
	MempoolTransactionRepositoryFactory: Symbol.for("API<Factory.MempoolTransactionRepositoryFactory>"),
	PeerRepositoryFactory: Symbol.for("API<Factory.PeerRepositoryFactory>"),
	StateRepositoryFactory: Symbol.for("API<Factory.StateRepositoryFactory>"),
	TransactionRepositoryFactory: Symbol.for("API<Factory.TransactionRepositoryFactory>"),
	ValidatorRoundRepositoryFactory: Symbol.for("API<Factory.ValidatorRoundRepositoryFactory>"),
	WalletRepositoryFactory: Symbol.for("API<Factory.WalletRepositoryFactory>"),
};
