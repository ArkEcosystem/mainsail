import { Contracts } from "@mainsail/core-contracts";

import { getPeers as proto } from "./proto/protos";

export const getPeers = {
	request: {
		deserialize: (payload: Buffer): {} => proto.GetPeersRequest.decode(payload),
		serialize: (object: proto.GetPeersRequest): Buffer =>
			Buffer.from(proto.GetPeersRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): Contracts.P2P.PeerBroadcast[] =>
			proto.GetPeersResponse.decode(payload).peers as Contracts.P2P.PeerBroadcast[],
		serialize: (peers: Contracts.P2P.PeerBroadcast[]): Buffer =>
			Buffer.from(proto.GetPeersResponse.encode({ peers }).finish()),
	},
};
