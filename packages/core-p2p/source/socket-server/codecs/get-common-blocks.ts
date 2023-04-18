import { peer } from "./proto/protos";

export const getCommonBlocks = {
	request: {
		deserialize: (payload: Buffer): peer.IGetCommonBlocksRequest => peer.GetCommonBlocksRequest.decode(payload),
		serialize: (object: peer.IGetCommonBlocksRequest): Buffer =>
			Buffer.from(peer.GetCommonBlocksRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): peer.IGetCommonBlocksResponse => peer.GetCommonBlocksResponse.decode(payload),
		serialize: (object: peer.IGetCommonBlocksResponse): Buffer =>
			Buffer.from(peer.GetCommonBlocksResponse.encode(object).finish()),
	},
};
