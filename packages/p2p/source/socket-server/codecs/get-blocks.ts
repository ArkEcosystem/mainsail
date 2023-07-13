import { getBlocks as proto } from "./proto/protos";

export const getBlocks = {
	request: {
		deserialize: (payload: Buffer): proto.IGetBlocksRequest => proto.GetBlocksRequest.decode(payload),
		serialize: (object: proto.IGetBlocksRequest): Buffer =>
			Buffer.from(proto.GetBlocksRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetBlocksResponse => proto.GetBlocksResponse.decode(payload).toJSON(),
		serialize: (object: proto.IGetBlocksResponse): Buffer =>
			Buffer.from(proto.GetBlocksResponse.encode(object).finish()),
	},
};
