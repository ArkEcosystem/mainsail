import type { Contracts } from "@mainsail/contracts";

export const getPeerIp = (request: Contracts.P2P.Request): string => {
	// WebSockets requests
	if (request.socket) {
		return request.socket.info.remoteAddress;
	}

	// HTTP requests
	return request.info.remoteAddress;
};
