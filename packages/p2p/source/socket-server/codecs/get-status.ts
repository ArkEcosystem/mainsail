import { getStatus as proto } from "./proto/protos.js";

export const getStatus = {
	request: {
		deserialize: (payload: Buffer): proto.IGetStatusRequest => proto.GetStatusRequest.decode(payload),
		serialize: (object: proto.IGetStatusRequest): Buffer =>
			Buffer.from(proto.GetStatusRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetStatusResponse =>
			proto.GetStatusResponse.toObject(proto.GetStatusResponse.decode(payload), {
				defaults: true,
			}),
		serialize: (object: proto.IGetStatusResponse): Buffer =>
			Buffer.from(proto.GetStatusResponse.encode(object).finish()),
	},
};
