import { getBlocks as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

type GetBlocksRequest = WithUnpackedHeaders<proto.GetBlocksRequest.$Properties> & {
	fromBlockNumber: number;
	limit: number;
};

export const getBlocks = {
	request: {
		deserialize: (payload: Buffer): GetBlocksRequest => {
			const decoded = proto.GetBlocksRequest.toObject(proto.GetBlocksRequest.decode(payload), {
				defaults: true,
			});
			return unpackHeadersBitmaps(decoded) as GetBlocksRequest;
		},
		serialize: (object: GetBlocksRequest): Buffer =>
			Buffer.from(proto.GetBlocksRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.GetBlocksResponse.$Properties> => {
			const decoded = proto.GetBlocksResponse.toObject(proto.GetBlocksResponse.decode(payload), {
				defaults: true,
			});
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.GetBlocksResponse.$Properties>): Buffer =>
			Buffer.from(proto.GetBlocksResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
