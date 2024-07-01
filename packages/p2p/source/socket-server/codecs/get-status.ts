import type * as types from "./proto/protos.d.ts";
import * as _protos from "./proto/protos.js";

const proto = (_protos as any).default.getStatus as typeof types.getStatus;

export const getStatus = {
	request: {
		deserialize: (payload: Buffer): {} => proto.GetStatusRequest.decode(payload),
		serialize: (object: types.getStatus.GetStatusRequest): Buffer =>
			Buffer.from(proto.GetStatusRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): types.getStatus.IGetStatusResponse =>
			proto.GetStatusResponse.toObject(proto.GetStatusResponse.decode(payload), {
				defaults: true,
			}),
		serialize: (object: types.getStatus.IGetStatusResponse): Buffer =>
			Buffer.from(proto.GetStatusResponse.encode(object).finish()),
	},
};
