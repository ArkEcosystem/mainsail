import type { LookupFunction } from "net";

import { IpAddress } from "@mainsail/utils";
import dns from "dns";

// A lookup that fails when the host name resolves to an address that is not public, so that a name
// handed to us by a peer cannot point a request at this node, its LAN or a metadata endpoint.
export const publicLookup: LookupFunction = (hostname, options, callback) => {
	dns.lookup(hostname, options, (error, result, family) => {
		if (error) {
			callback(error, result, family);
			return;
		}

		const addresses = Array.isArray(result) ? result.map(({ address }) => address) : [result];
		const nonPublic = addresses.find((address) => !IpAddress.isPublicIp(address));

		if (nonPublic !== undefined) {
			callback(new Error(`${hostname} resolves to the non-public address ${nonPublic}`), result, family);
			return;
		}

		// eslint-disable-next-line unicorn/no-null
		callback(null, result, family);
	});
};
