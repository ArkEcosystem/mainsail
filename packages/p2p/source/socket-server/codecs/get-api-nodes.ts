import { getApiNodes as proto } from "./proto/protos.js";

export const getApiNodes = {
	request: {
		deserialize: (payload: Buffer): proto.IGetApiNodesRequest => proto.GetApiNodesRequest.decode(payload),
		serialize: (object: proto.IGetApiNodesRequest): Buffer =>
			Buffer.from(proto.GetApiNodesRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetApiNodesResponse =>
			proto.GetApiNodesResponse.toObject(proto.GetApiNodesResponse.decode(payload), {
				defaults: true,
			}),
		serialize: (object: proto.IGetApiNodesResponse): Buffer =>
			Buffer.from(proto.GetApiNodesResponse.encode(object).finish()),
	},
};
