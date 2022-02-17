export const defaults = {
	fileRotator: {
		interval: "1d",
	},
	levels: {
		console: process.env.CORE_LOG_LEVEL || "info",
		file: process.env.CORE_LOG_LEVEL_FILE || "debug",
	},
};
