import type { LookupFunction } from "net";

import dns from "dns";

import { isPublicIp } from "./is-valid-peer.js";

export const publicLookup: LookupFunction = (hostname, options, callback) => {
	dns.lookup(hostname, options, (error, result, family) => {
		if (error) {
			callback(error, result, family);
			return;
		}

		const addresses = Array.isArray(result) ? result.map(({ address }) => address) : [result];
		const nonPublic = addresses.find((address) => !isPublicIp(address));

		if (nonPublic !== undefined) {
			callback(new Error(`${hostname} resolves to the non-public address ${nonPublic}`), result, family);
			return;
		}

		// eslint-disable-next-line unicorn/no-null
		callback(null, result, family);
	});
};
