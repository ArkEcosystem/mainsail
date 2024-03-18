import type * as types from "./proto/protos.d.ts";
import * as _protos from "./proto/protos.js";

const proto = (_protos as any).default.getApiNodes as typeof types.getApiNodes;

export const getApiNodes = {
	request: {
		deserialize: (payload: Buffer): {} => proto.GetApiNodesRequest.decode(payload),
		serialize: (object: types.getApiNodes.GetApiNodesRequest): Buffer =>
			Buffer.from(proto.GetApiNodesRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): types.getApiNodes.IGetApiNodesResponse =>
			proto.GetApiNodesResponse.toObject(proto.GetApiNodesResponse.decode(payload), {
				defaults: true,
			}),
		serialize: (object: types.getApiNodes.IGetApiNodesResponse): Buffer =>
			Buffer.from(proto.GetApiNodesResponse.encode(object).finish()),
	},
};
