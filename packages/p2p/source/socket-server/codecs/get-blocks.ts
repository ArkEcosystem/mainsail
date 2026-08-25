import { packHeadersBitmaps, unpackHeadersBitmaps } from "./headers.js";
import { getBlocks as proto } from "./proto/protos.js";

export const getBlocks = {
	request: {
		deserialize: (payload: Buffer): proto.IGetBlocksRequest => {
			const decoded = proto.GetBlocksRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IGetBlocksRequest): Buffer =>
			Buffer.from(proto.GetBlocksRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetBlocksResponse => {
			const decoded = proto.GetBlocksResponse.toObject(proto.GetBlocksResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IGetBlocksResponse): Buffer =>
			Buffer.from(proto.GetBlocksResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
