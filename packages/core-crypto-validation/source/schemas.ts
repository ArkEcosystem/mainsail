export const schemas = {
	// @TODO: plugins should register this rule
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

	// @TODO: plugins should register this rule
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

	// @TODO: plugins should register this rule
	blockHeader: {
		$id: "blockHeader",
		properties: {
			blockSignature: { $ref: "hex" },
			generatorPublicKey: { $ref: "publicKey" },
			height: { minimum: 1, type: "integer" },
			id: { blockId: {} },
			numberOfTransactions: { type: "integer" },
			payloadHash: { $ref: "hex" },
			payloadLength: { minimum: 0, type: "integer" },
			previousBlock: { blockId: { allowNullWhenGenesis: true, isPreviousBlock: true } },
			reward: { bignumber: { minimum: 0 } },
			timestamp: { minimum: 0, type: "integer" },
			totalAmount: { bignumber: { block: true, bypassGenesis: true, minimum: 0 } },
			totalFee: { bignumber: { block: true, bypassGenesis: true, minimum: 0 } },
			version: { enum: [1] },
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

	// @TODO: plugins should register this rule
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

	// @TODO: plugins should register this rule
	publicKey: {
		$id: "publicKey",
		allOf: [{ maxLength: 64, minLength: 64 }, { $ref: "hex" }, { transform: ["toLowerCase"] }], //64=schnorr,66=ecdsa
	},

	// @TODO: plugins should register this rule
	transactionId: {
		$id: "transactionId",
		allOf: [{ maxLength: 64, minLength: 64 }, { $ref: "hex" }],
	},

	uri: {
		$id: "uri",
		allOf: [{ format: "uri" }, { maxLength: 80, minLength: 4 }],
	},

	// @TODO: plugins should register this rule
	username: {
		$id: "validatorUsername",
		allOf: [
			{ pattern: "^[a-z0-9!@$&_.]+$", type: "string" },
			{ maxLength: 20, minLength: 1 },
			{ transform: ["toLowerCase"] },
		],
	},

	// @TODO: plugins should register this rule
	walletVote: {
		$id: "walletVote",
		allOf: [{ pattern: "^[+|-][a-zA-Z0-9]{66}$", type: "string" }, { transform: ["toLowerCase"] }],
	},
};
