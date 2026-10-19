import type { Contracts } from "@mainsail/contracts";

import { sanitizeRemoteAddress } from "../validation/is-valid-peer.js";

export const getPeerIp = (request: Contracts.P2P.Request): string => {
	const remoteAddress = request.socket ? request.socket.info.remoteAddress : request.info.remoteAddress;

	return sanitizeRemoteAddress(remoteAddress) ?? remoteAddress;
};
