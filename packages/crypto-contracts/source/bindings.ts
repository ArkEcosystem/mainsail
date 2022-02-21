export const BINDINGS = {
	Configuration: Symbol.for("Crypto<Configuration>"),
	Block: {
		Deserializer: Symbol.for("Crypto<Block.Deserializer>"),
		Factory: Symbol.for("Crypto<Block.Factory>"),
		IdFactory: Symbol.for("Crypto<Block.IdFactory>"),
		Serializer: Symbol.for("Crypto<Block.Serializer>"),
		Verifier: Symbol.for("Crypto<Block.Verifier>"),
	},
	HashFactory: Symbol.for("Crypto<HashFactory>"),
	SignatureFactory: Symbol.for("Crypto<SignatureFactory>"),
};
