import type * as types from "./proto/protos.d.ts";
import * as _protos from "./proto/protos.js";

const proto = (_protos as any).default.getPeers as typeof types.getPeers;

export const getPeers = {
	request: {
		deserialize: (payload: Buffer): {} => proto.GetPeersRequest.decode(payload),
		serialize: (object: types.getPeers.GetPeersRequest): Buffer =>
			Buffer.from(proto.GetPeersRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): types.getPeers.IGetPeersResponse =>
			proto.GetPeersResponse.toObject(proto.GetPeersResponse.decode(payload), {
				defaults: true,
			}),
		serialize: (object: types.getPeers.IGetPeersResponse): Buffer =>
			Buffer.from(proto.GetPeersResponse.encode(object).finish()),
	},
};
