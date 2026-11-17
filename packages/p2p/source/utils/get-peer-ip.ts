import type { Contracts } from "@mainsail/contracts";

import { assert, IpAddress } from "@mainsail/utils";

export const getPeerIp = (request: Contracts.P2P.Request): string => {
	const remoteAddress = request.socket ? request.socket.info.remoteAddress : request.info.remoteAddress;

	const ip = IpAddress.canonicalAddress(remoteAddress);
	assert.string(ip);

	return ip;
};
