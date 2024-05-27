const commit = {
	type: "boolean",
};

const getStatus = {
	properties: {
		height: {
			type: "integer",
		},
		version: {
			type: "string",
		},
	},
	required: ["height", "version"],
	type: "object",
};

const getTransactions = {
	items: {
		type: "string",
	},
	type: "array",
};

const importSnapshot = {
	type: "boolean",
};

const listSnapshots = {
	items: {
		type: "integer",
	},
	type: "array",
};

const jsonRpcId = {
	anyOf: [{ type: "string" }, { type: "integer" }, { type: "null" }],
};

const jsonRpcVersion = {
	const: "2.0",
	type: "string",
};

const jsonRpcError = {
	additionalProperties: false,
	properties: {
		error: {
			additionalProperties: false,
			properties: {
				code: { type: "integer" },
				data: {},
				message: { type: "string" },
			},
			required: ["code", "message"],
			type: "object",
		},
		id: jsonRpcId,
		jsonrpc: jsonRpcVersion,
	},
	required: ["jsonrpc", "error", "id"],
	type: "object",
};

const jsonRpcResult = {
	additionalProperties: false,
	properties: {
		id: jsonRpcId,
		jsonrpc: jsonRpcVersion,
		result: {},
	},
	required: ["jsonrpc", "result", "id"],
	type: "object",
};

export const jsonRpcResponse = {
	oneOf: [jsonRpcError, jsonRpcResult],
};

export const ReplySchemas = {
	commit: commit,
	get_status: getStatus,
	get_transactions: getTransactions,
	import_snapshot: importSnapshot,
	list_snapshots: listSnapshots,
};
