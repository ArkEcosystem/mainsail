export const bufferTransformer = {
	from: (value: Buffer | undefined | null): string | null => {
		if (value !== undefined && value !== null) {
			return `0x${value.toString("hex")}`;
		}

		return null;
	},
	to: (value: any): any => {
		if (typeof value === "string") {
			return Buffer.from(value.startsWith("0x") ? value.slice(2) : value, "hex");
		}

		return value;
	},
};
