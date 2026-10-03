import { packHeadersBitmaps, unpackHeadersBitmaps } from "./headers.js";
import { getPeers as proto } from "./proto/protos.js";

export const getPeers = {
	request: {
		deserialize: (payload: Buffer): proto.IGetPeersRequest => {
			const decoded = proto.GetPeersRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IGetPeersRequest): Buffer =>
			Buffer.from(proto.GetPeersRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetPeersResponse => {
			const decoded = proto.GetPeersResponse.toObject(proto.GetPeersResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IGetPeersResponse): Buffer =>
			Buffer.from(proto.GetPeersResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
