export const Identifiers = {
	Contracts: {
		Addresses: {
			Consensus: Symbol.for("Evm.Consensus<Contracts.Addresses.Consensus>"),
			Usernames: Symbol.for("Evm.Consensus<Contracts.Addresses.Usernames>"),
			MultiPayment: Symbol.for("Evm.Consensus<Contracts.Addresses.MultiPayment>"),
		},
	},
	Internal: {
		Addresses: {
			Deployer: Symbol.for("Evm.Consensus<Internal.Addresses.Deployer>"),
		},
		Deployer: Symbol.for("Evm.Consensus<Internal.Deployer>"),
		GenesisInfo: Symbol.for("Evm.Consensus<Internal.GenesisInfo>"),
	},
};
