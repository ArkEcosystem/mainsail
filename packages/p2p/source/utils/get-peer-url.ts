import { Contracts } from "@mainsail/contracts";

import { type shared } from "../socket-server/codecs/proto/protos";

export const getPeerUrl = (peer: shared.IPeerLike): string => {
	let protocol = peer.protocol;

	// Heuristically check based on port first to match existing behavior.
	switch (peer.port) {
		case 80: {
			protocol = Contracts.P2P.PeerProtocol.Http;
			break;
		}
		case 443: {
			protocol = Contracts.P2P.PeerProtocol.Https;
			break;
		}
		default: {
			break;
		}
	}

	switch (protocol) {
		case Contracts.P2P.PeerProtocol.Http: {
			return `http://${peer.ip}:${peer.port}`;
		}
		case Contracts.P2P.PeerProtocol.Https: {
			return `https://${peer.ip}:${peer.port}`;
		}
		default: {
			// fallback to HTTP just in case
			return `http://${peer.ip}:${peer.port}`;
		}
	}
};
