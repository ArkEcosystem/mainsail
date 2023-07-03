import { FormatDefinition } from "ajv";

import { isValidPeerIp } from "./is-valid-peer";

export const makeFormats = () => {
	const validPeer: FormatDefinition<string> = {
		type: "string",
		validate: (ip: string) => {
			try {
				return isValidPeerIp(ip, false);
			} catch {
				return false;
			}
		},
	};

	return { validPeer };
};
