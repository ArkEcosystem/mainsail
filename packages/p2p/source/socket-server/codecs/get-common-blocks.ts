import { getCommonBlocks as proto } from "./proto/protos";

export const getCommonBlocks = {
	request: {
		deserialize: (payload: Buffer): proto.IGetCommonBlocksRequest => proto.GetCommonBlocksRequest.decode(payload),
		serialize: (object: proto.IGetCommonBlocksRequest): Buffer =>
			Buffer.from(proto.GetCommonBlocksRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetCommonBlocksResponse =>
			proto.GetCommonBlocksResponse.decode(payload).toJSON(),
		serialize: (object: proto.IGetCommonBlocksResponse): Buffer =>
			Buffer.from(proto.GetCommonBlocksResponse.encode(object).finish()),
	},
};
