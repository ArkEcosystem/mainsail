import { packHeadersBitmaps, unpackHeadersBitmaps } from "./headers.js";
import { getApiNodes as proto } from "./proto/protos.js";

export const getApiNodes = {
	request: {
		deserialize: (payload: Buffer): proto.IGetApiNodesRequest => {
			const decoded = proto.GetApiNodesRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IGetApiNodesRequest): Buffer =>
			Buffer.from(proto.GetApiNodesRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetApiNodesResponse => {
			const decoded = proto.GetApiNodesResponse.toObject(proto.GetApiNodesResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IGetApiNodesResponse): Buffer =>
			Buffer.from(proto.GetApiNodesResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
