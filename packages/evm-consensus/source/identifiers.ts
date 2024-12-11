export const Identifiers = {
	Contracts: {
		Addresses: {
			Consensus: Symbol.for("Evm.Consensus<Contracts.Addresses.Consensus>"),
			Usernames: Symbol.for("Evm.Consensus<Contracts.Addresses.Usernames>"),
		},
	},
	Internal: {
		Deployer: Symbol.for("Evm.Consensus<Internal.Deployer>"),
		Addresses: {
			Deployer: Symbol.for("Evm.Consensus<Internal.Addresses.Deployer>"),
		},
		GenesisInfo: Symbol.for("Evm.Consensus<Internal.GenesisInfo>"),
	},
};
