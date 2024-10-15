export const bufferTransformer = {
	from: (value: Buffer | undefined | null): string | null => {
		if (value !== undefined && value !== null) {
			return `0x${value.toString("hex")}`;
		}

		return null;
	},
	to: (value: any): any => {
		if (typeof value === "string") {
			value = value.startsWith("0x") ? value.slice(2) : value;

			if (value === "") {
				return null;
			}

			return Buffer.from(value, "hex");
		}

		return value;
	},
};
