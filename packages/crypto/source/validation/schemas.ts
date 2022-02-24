export const schemas = {
	address: {
		$id: "address",
		allOf: [{ type: "string", maxLength: 34, minLength: 34 }, { $ref: "base58" }],
	},

	alphanumeric: {
		$id: "alphanumeric",
		pattern: "^[a-zA-Z0-9]+$",
		type: "string",
	},

	base58: {
		$id: "base58",
		pattern: "^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$",
		type: "string",
	},

	blockHeader: {
		$id: "blockHeader",
		required: [
			"id",
			"timestamp",
			"previousBlock",
			"height",
			"totalAmount",
			"totalFee",
			"reward",
			"generatorPublicKey",
			"blockSignature",
		],
		properties: {
			id: { blockId: {} },
			idHex: { blockId: {} },
			timestamp: { type: "integer", minimum: 0 },
			version: { type: "integer", minimum: 0 },
			previousBlock: { blockId: { allowNullWhenGenesis: true, isPreviousBlock: true } },
			height: { type: "integer", minimum: 1 },
			previousBlockHex: { blockId: { allowNullWhenGenesis: true, isPreviousBlock: true } },
			numberOfTransactions: { type: "integer" },
			totalAmount: { bignumber: { type: "number", bypassGenesis: true, minimum: 0, block: true } },
			reward: { bignumber: { type: "number", minimum: 0 } },
			totalFee: { bignumber: { type: "number", minimum: 0, bypassGenesis: true, block: true } },
			payloadHash: { $ref: "hex" },
			payloadLength: { type: "integer", minimum: 0 },
			blockSignature: { $ref: "hex" },
			generatorPublicKey: { $ref: "publicKey" },
		},
		type: "object",
	},

	block: {
		$id: "block",
		$ref: "blockHeader",
		type: "object",
		properties: {
			transactions: {
				$ref: "transactions",
				type: "array",
				maxItems: { $data: "1/numberOfTransactions" },
				minItems: { $data: "1/numberOfTransactions" },
			},
		},
	},

	genericName: {
		$id: "genericName",
		allOf: [
			{ pattern: "^[a-zA-Z0-9]+(( - |[ ._-])[a-zA-Z0-9]+)*[.]?$", type: "string" },
			{ type: "string", maxLength: 40, minLength: 1 },
		],
	},

	hex: {
		$id: "hex",
		pattern: "^[0123456789A-Fa-f]+$",
		type: "string",
	},

	networkByte: {
		$id: "networkByte",
		network: true,
	},

	publicKey: {
		$id: "publicKey",
		allOf: [{ type: "string", maxLength: 66, minLength: 66 }, { $ref: "hex" }, { transform: ["toLowerCase"] }],
	},

	transactionId: {
		$id: "transactionId",
		allOf: [{ type: "string", maxLength: 64, minLength: 64 }, { $ref: "hex" }],
	},

	uri: {
		$id: "uri",
		allOf: [{ format: "uri" }, { type: "string", maxLength: 80, minLength: 4 }],
	},

	username: {
		$id: "delegateUsername",
		allOf: [
			{ pattern: "^[a-z0-9!@$&_.]+$", type: "string" },
			{ type: "string", maxLength: 20, minLength: 1 },
			{ transform: ["toLowerCase"] },
		],
	},

	walletVote: {
		$id: "walletVote",
		allOf: [{ pattern: "^[+|-][a-zA-Z0-9]{66}$", type: "string" }, { transform: ["toLowerCase"] }],
	},
};
