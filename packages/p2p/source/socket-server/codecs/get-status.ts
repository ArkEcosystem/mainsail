import { packHeadersBitmaps, unpackHeadersBitmaps } from "./headers.js";
import { getStatus as proto } from "./proto/protos.js";

export const getStatus = {
	request: {
		deserialize: (payload: Buffer): proto.IGetStatusRequest => {
			const decoded = proto.GetStatusRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IGetStatusRequest): Buffer =>
			Buffer.from(proto.GetStatusRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetStatusResponse => {
			const decoded = proto.GetStatusResponse.toObject(proto.GetStatusResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IGetStatusResponse): Buffer =>
			Buffer.from(proto.GetStatusResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
