import { getApiNodes as proto } from "./proto/protos";

export const getApiNodes = {
	request: {
		deserialize: (payload: Buffer): {} => proto.GetApiNodesRequest.decode(payload),
		serialize: (object: proto.GetApiNodesRequest): Buffer =>
			Buffer.from(proto.GetApiNodesRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetApiNodesResponse =>
			proto.GetApiNodesResponse.toObject(proto.GetApiNodesResponse.decode(payload), { defaults: true }),
		serialize: (object: proto.IGetApiNodesResponse): Buffer =>
			Buffer.from(proto.GetApiNodesResponse.encode(object).finish()),
	},
};
