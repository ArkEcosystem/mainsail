import { Enums } from "@mainsail/constants";

import { type shared } from "../socket-server/codecs/proto/protos.js";

export const getPeerUrl = (peer: shared.IPeerLike): string => {
	let protocol = peer.protocol;

	// Heuristically check based on port first to match existing behavior.
	switch (peer.port) {
		case 80: {
			protocol = Enums.Api.Protocol.Http;
			break;
		}
		case 443: {
			protocol = Enums.Api.Protocol.Https;
			break;
		}
		default: {
			break;
		}
	}

	switch (protocol) {
		case Enums.Api.Protocol.Http: {
			return `http://${peer.ip}:${peer.port}`;
		}
		case Enums.Api.Protocol.Https: {
			return `https://${peer.ip}:${peer.port}`;
		}
		default: {
			// fallback to HTTP just in case
			return `http://${peer.ip}:${peer.port}`;
		}
	}
};
