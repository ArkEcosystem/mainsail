export const schemas = {
	address: {
		$id: "address",
		allOf: [{ maxLength: 34, minLength: 34 }, { $ref: "base58" }],
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

	block: {
		$id: "block",
		$ref: "blockHeader",
		properties: {
			transactions: {
				$ref: "transactions",
				maxItems: { $data: "1/numberOfTransactions" },
				minItems: { $data: "1/numberOfTransactions" },
			},
		},
	},

	blockHeader: {
		$id: "blockHeader",
		properties: {
			blockSignature: { $ref: "hex" },
			generatorPublicKey: { $ref: "publicKey" },
			height: { minimum: 1, type: "integer" },
			id: { blockId: {} },
			idHex: { blockId: {} },
			numberOfTransactions: { type: "integer" },
			payloadHash: { $ref: "hex" },
			payloadLength: { minimum: 0, type: "integer" },
			previousBlock: { blockId: { allowNullWhenGenesis: true, isPreviousBlock: true } },
			previousBlockHex: { blockId: { allowNullWhenGenesis: true, isPreviousBlock: true } },
			reward: { bignumber: { minimum: 0 } },
			timestamp: { minimum: 0, type: "integer" },
			totalAmount: { bignumber: { block: true, bypassGenesis: true, minimum: 0 } },
			totalFee: { bignumber: { block: true, bypassGenesis: true, minimum: 0 } },
			version: { minimum: 0, type: "integer" },
		},
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
		type: "object",
	},

	genericName: {
		$id: "genericName",
		allOf: [
			{ pattern: "^[a-zA-Z0-9]+(( - |[ ._-])[a-zA-Z0-9]+)*[.]?$", type: "string" },
			{ maxLength: 40, minLength: 1 },
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
		allOf: [{ maxLength: 66, minLength: 66 }, { $ref: "hex" }, { transform: ["toLowerCase"] }],
	},

	transactionId: {
		$id: "transactionId",
		allOf: [{ maxLength: 64, minLength: 64 }, { $ref: "hex" }],
	},

	uri: {
		$id: "uri",
		allOf: [{ format: "uri" }, { maxLength: 80, minLength: 4 }],
	},

	username: {
		$id: "delegateUsername",
		allOf: [
			{ pattern: "^[a-z0-9!@$&_.]+$", type: "string" },
			{ maxLength: 20, minLength: 1 },
			{ transform: ["toLowerCase"] },
		],
	},

	walletVote: {
		$id: "walletVote",
		allOf: [{ pattern: "^[+|-][a-zA-Z0-9]{66}$", type: "string" }, { transform: ["toLowerCase"] }],
	},
};
