export const BINDINGS = {
	Configuration: Symbol.for("Crypto<Configuration>"),
	Block: {
		Deserializer: Symbol.for("Crypto<Block.Deserializer>"),
		Factory: Symbol.for("Crypto<Block.Factory>"),
		IdFactory: Symbol.for("Crypto<Block.IdFactory>"),
		Serializer: Symbol.for("Crypto<Block.Serializer>"),
		Verifier: Symbol.for("Crypto<Block.Verifier>"),
	},
	Transaction: {
		Deserializer: Symbol.for("Crypto<Transaction.Deserializer>"),
		Factory: Symbol.for("Crypto<Transaction.Factory>"),
		Serializer: Symbol.for("Crypto<Transaction.Serializer>"),
		Signer: Symbol.for("Crypto<Transaction.Signer>"),
		Utils: Symbol.for("Crypto<Transaction.Utils>"),
		Verifier: Symbol.for("Crypto<Transaction.Verifier>"),
	},
	HashFactory: Symbol.for("Crypto<HashFactory>"),
	SignatureFactory: Symbol.for("Crypto<SignatureFactory>"),
	Validator: Symbol.for("Crypto<Validator>"),
};
