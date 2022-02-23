export const BINDINGS = {
	Block: {
		Deserializer: Symbol.for("Crypto<Block.Deserializer>"),
		Factory: Symbol.for("Crypto<Block.Factory>"),
		IDFactory: Symbol.for("Crypto<Block.IDFactory>"),
		Serializer: Symbol.for("Crypto<Block.Serializer>"),
		Verifier: Symbol.for("Crypto<Block.Verifier>"),
	},
	Configuration: Symbol.for("Crypto<Configuration>"),
	HashFactory: Symbol.for("Crypto<HashFactory>"),
	Identity: {
		AddressFactory: Symbol.for("Crypto<Identity.AddressFactory>"),
		KeyPairFactory: Symbol.for("Crypto<Identity.KeyPairFactory>"),
		PrivateKeyFactory: Symbol.for("Crypto<Identity.PrivateKeyFactory>"),
		PublicKeyFactory: Symbol.for("Crypto<Identity.PublicKeyFactory>"),
		WifFactory: Symbol.for("Crypto<Identity.WifFactory>"),
	},
	SignatureFactory: Symbol.for("Crypto<SignatureFactory>"),
	Time: {
		BlockTimeCalculator: Symbol.for("Crypto<Time.BlockTimeCalculator>"),
		Slots: Symbol.for("Crypto<Time.Slots>"),
	},
	Transaction: {
		Deserializer: Symbol.for("Crypto<Transaction.Deserializer>"),
		Factory: Symbol.for("Crypto<Transaction.Factory>"),
		Registry: Symbol.for("Crypto<Transaction.Registry>"),
		Serializer: Symbol.for("Crypto<Transaction.Serializer>"),
		Signer: Symbol.for("Crypto<Transaction.Signer>"),
		Utils: Symbol.for("Crypto<Transaction.Utils>"),
		Verifier: Symbol.for("Crypto<Transaction.Verifier>"),
	},
	Validator: Symbol.for("Crypto<Validator>"),
};
