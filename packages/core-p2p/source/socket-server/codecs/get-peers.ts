import { Contracts } from "@arkecosystem/core-contracts";

import { peer } from "./proto/protos";

export const getPeers = {
	request: {
		deserialize: (payload: Buffer): {} => peer.GetPeersRequest.decode(payload),
		serialize: (object: peer.GetPeersRequest): Buffer => Buffer.from(peer.GetPeersRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): Contracts.P2P.PeerBroadcast[] =>
			peer.GetPeersResponse.decode(payload).peers as Contracts.P2P.PeerBroadcast[],
		serialize: (peers: Contracts.P2P.PeerBroadcast[]): Buffer =>
			Buffer.from(peer.GetPeersResponse.encode({ peers }).finish()),
	},
};
