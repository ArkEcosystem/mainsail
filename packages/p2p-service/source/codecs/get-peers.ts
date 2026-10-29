import { getPeers as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

export const getPeers = {
	request: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.GetPeersRequest.$Properties> => {
			const decoded = proto.GetPeersRequest.decode(payload);
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.GetPeersRequest.$Properties>): Buffer =>
			Buffer.from(proto.GetPeersRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.GetPeersResponse.$Properties> => {
			const decoded = proto.GetPeersResponse.toObject(proto.GetPeersResponse.decode(payload), {
				defaults: true,
			});
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.GetPeersResponse.$Properties>): Buffer =>
			Buffer.from(proto.GetPeersResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
