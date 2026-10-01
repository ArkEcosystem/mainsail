import { Enums } from "@mainsail/constants";
import { IpAddress } from "@mainsail/utils";

import { type shared } from "../socket-server/codecs/proto/protos.js";

export const getPeerUrl = (peer: shared.IPeerLike): string => {
	let protocol = peer.protocol;
	const host = IpAddress.normalizeAddress(peer.ip ?? "");

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
			return `http://${host}:${peer.port}`;
		}
		case Enums.Api.Protocol.Https: {
			return `https://${host}:${peer.port}`;
		}
		default: {
			// fallback to HTTP just in case
			return `http://${host}:${peer.port}`;
		}
	}
};
