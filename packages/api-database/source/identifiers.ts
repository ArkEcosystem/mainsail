export const Identifiers = {
	DataSource: Symbol.for("API<DataSource>"),
	BlockRepositoryFactory: Symbol.for("API<Factory.BlockRepository>"),
	ConfigurationRepositoryFactory: Symbol.for("API<Factory.ConfigurationRepository>"),
	MempoolTransactionRepositoryFactory: Symbol.for("API<Factory.MempoolTransactionRepositoryFactory>"),
	PeerRepositoryFactory: Symbol.for("API<Factory.PeerRepositoryFactory>"),
	PluginRepositoryFactory: Symbol.for("API<Factory.PluginRepositoryFactory>"),
	StateRepositoryFactory: Symbol.for("API<Factory.StateRepositoryFactory>"),
	TransactionRepositoryFactory: Symbol.for("API<Factory.TransactionRepositoryFactory>"),
	TransactionTypeRepositoryFactory: Symbol.for("API<Factory.TransactionTypeRepositoryFactory>"),
	ValidatorRoundRepositoryFactory: Symbol.for("API<Factory.ValidatorRoundRepositoryFactory>"),
	WalletRepositoryFactory: Symbol.for("API<Factory.WalletRepositoryFactory>"),
};
