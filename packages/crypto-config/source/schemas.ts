import type { AnySchemaObject } from "ajv";

const milestoneBlock: AnySchemaObject = {
	properties: {
		maxGasLimit: { minimum: 0, type: "integer" },
		maxPayload: { minimum: 0, type: "integer" },
		version: { minimum: 0, type: "integer" },
	},
	required: ["maxGasLimit", "maxPayload", "version"],
	type: "object",
};

const milestoneGas: AnySchemaObject = {
	properties: {
		maximumGasLimit: { minimum: 0, type: "integer" },
		maximumGasPrice: { minimum: 0, type: "integer" },
		minimumGasLimit: { minimum: 0, type: "integer" },
		minimumGasPrice: { minimum: 0, type: "integer" },
	},
	required: ["maximumGasLimit", "maximumGasPrice", "minimumGasLimit", "minimumGasPrice"],
	type: "object",
};

const milestoneSatoshi: AnySchemaObject = {
	properties: {
		decimals: { minimum: 0, type: "integer" },
		denomination: { minimum: 0, type: "integer" },
	},
	required: ["decimals", "denomination"],
	type: "object",
};

const milestoneTimeouts: AnySchemaObject = {
	properties: {
		blockPrepareTime: { minimum: 0, type: "integer" },
		blockTime: { minimum: 0, type: "integer" },
		stageTimeout: { minimum: 0, type: "integer" },
		stageTimeoutIncrease: { minimum: 0, type: "integer" },
		tolerance: { minimum: 0, type: "integer" },
	},
	required: ["blockPrepareTime", "blockTime", "stageTimeout", "stageTimeoutIncrease", "tolerance"],
	type: "object",
};

const milestoneSnapshot: AnySchemaObject = {
	properties: {
		previousGenesisBlockHash: {
			allOf: [{ $ref: "hex" }, { maxLength: 64, minLength: 64 }],
			type: "string",
		},
		snapshotHash: {
			allOf: [{ $ref: "hex" }, { maxLength: 64, minLength: 64 }],
			type: "string",
		},
	},
	required: ["snapshotHash", "previousGenesisBlockHash"],
	type: "object",
};

const milestoneP2p: AnySchemaObject = {
	properties: {
		minimumVersions: {
			items: { type: "string" },
			type: "array",
		},
	},
	type: "object",
};

const milestone: AnySchemaObject = {
	$id: "milestone",
	properties: {
		block: milestoneBlock,
		epoch: { type: "string" },
		evmSpec: { type: "string" },
		gas: milestoneGas,
		height: { minimum: 0, type: "integer" },
		p2p: milestoneP2p,
		reward: { type: "string" },
		roundValidators: { minimum: 0, type: "integer" },
		satoshi: milestoneSatoshi,
		snapshot: milestoneSnapshot,
		timeouts: milestoneTimeouts,
		validatorRegistrationFee: { type: "string" },
	},
	required: [
		"block",
		"epoch",
		"evmSpec",
		"gas",
		"height",
		"reward",
		"roundValidators",
		"satoshi",
		"timeouts",
		"validatorRegistrationFee",
	],
	type: "object",
};

const milestones: AnySchemaObject = {
	$id: "milestones",
	items: { $ref: "milestone" },
	type: "array",
};

const network: AnySchemaObject = {
	$id: "network",
	properties: {
		chainId: { minimum: 0, type: "integer" },
		client: {
			properties: {
				explorer: { type: "string" },
				symbol: { type: "string" },
				token: { type: "string" },
			},
			required: ["token", "symbol", "explorer"],
			type: "object",
		},
		name: { type: "string" },
		nethash: {
			allOf: [{ $ref: "hex" }, { maxLength: 64, minLength: 64 }],
			type: "string",
		},
		pubKeyHash: { minimum: 0, type: "integer" },
		wif: { minimum: 0, type: "integer" },
	},
	required: ["chainId", "client", "name", "nethash", "pubKeyHash", "wif"],
	type: "object",
};

const cryptoConfig: AnySchemaObject = {
	$id: "cryptoConfig",
	additionalProperties: false,
	properties: {
		genesisBlock: { type: "object" },
		milestones: { $ref: "milestones" },
		network: { $ref: "network" },
	},
	required: ["genesisBlock", "milestones", "network"],
	type: "object",
};

export const schemas: Record<"network" | "milestone" | "milestones" | "cryptoConfig", AnySchemaObject> = {
	cryptoConfig,
	milestone,
	milestones,
	network,
};
