import type { Contracts } from "@mainsail/contracts";

export const Flags = {
	castFlagsToString(flags: Contracts.Cli.AnyObject, ignoreKeys: string[] = []): string {
		const stringFlags: string[] = [];

		for (const [key, value] of Object.entries(flags)) {
			if (!ignoreKeys.includes(key) && value !== undefined) {
				if (value === true) {
					stringFlags.push(`--${key}`);
				} else if (typeof value === "string") {
					stringFlags.push(`--${key}='${value}'`);
				} else {
					stringFlags.push(`--${key}=${value}`);
				}
			}
		}

		return stringFlags.join(" ");
	},
};
