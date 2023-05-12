export const Identifiers = {
	Application: Symbol.for("Configuration<Application>"),
	ConfigurationGenerator: Symbol.for("Configuration<Generator>"),
	ConfigurationPath: Symbol.for("Configuration<Path>"),
	ConfigurationWriter: Symbol.for("Configuration<Writer>"),
	Generator: {
		App: Symbol.for("Generator<App>"),
		Environment: Symbol.for("Generator<Environment>"),
		GenesisBlock: Symbol.for("Generator<GenesisBlock>"),
		Milestones: Symbol.for("Generator<Milestones>"),
		Mnemonic: Symbol.for("Generator<Mnemonic>"),
		Network: Symbol.for("Generator<Network>"),
		Peers: Symbol.for("Generator<Peers>"),
		Wallet: Symbol.for("Generator<Wallet>"),
	},
	LogService: Symbol.for("Configuration<Logger>"),
};
