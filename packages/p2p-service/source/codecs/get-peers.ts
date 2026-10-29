import { getPeers as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

export const getPeers = {
	request: {
		deserialize: (payload: Buffer): proto.GetPeersRequest.$Properties => {
			const decoded = proto.GetPeersRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: WithUnpackedHeaders<proto.GetPeersRequest.$Properties>): Buffer =>
			Buffer.from(proto.GetPeersRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.GetPeersResponse.$Properties => {
			const decoded = proto.GetPeersResponse.toObject(proto.GetPeersResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: WithUnpackedHeaders<proto.GetPeersResponse.$Properties>): Buffer =>
			Buffer.from(proto.GetPeersResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
