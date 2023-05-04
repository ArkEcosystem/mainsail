import { FormatDefinition } from "ajv";

import { isValidPeer } from "./is-valid-peer";

export const makeFormats = () => {
	const validPeer: FormatDefinition<string> = {
		type: "string",
		validate: (ip: string) => {
			try {
				return isValidPeer({ ip }, false);
			} catch {
				return false;
			}
		},
	};

	return { validPeer };
};
