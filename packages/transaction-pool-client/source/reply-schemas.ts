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

export const ReplySchemas = {
	commit: commit,
	get_status: getStatus,
	get_transactions: getTransactions,
	import_snapshot: importSnapshot,
	list_snapshots: listSnapshots,
};
