import type * as types from "./proto/protos.d.ts";
import * as _protos from "./proto/protos.js";

const proto = (_protos as any).default.getBlocks as typeof types.getBlocks;

export const getBlocks = {
	request: {
		deserialize: (payload: Buffer): types.getBlocks.IGetBlocksRequest => proto.GetBlocksRequest.decode(payload),
		serialize: (object: types.getBlocks.IGetBlocksRequest): Buffer =>
			Buffer.from(proto.GetBlocksRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): types.getBlocks.IGetBlocksResponse =>
			proto.GetBlocksResponse.toObject(proto.GetBlocksResponse.decode(payload), {
				defaults: true,
			}),
		serialize: (object: types.getBlocks.IGetBlocksResponse): Buffer =>
			Buffer.from(proto.GetBlocksResponse.encode(object).finish()),
	},
};
