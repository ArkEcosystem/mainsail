import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";
import { getBlocks as proto } from "./proto/protos.js";

export const getBlocks = {
	request: {
		deserialize: (payload: Buffer): proto.GetBlocksRequest.$Properties => {
			const decoded = proto.GetBlocksRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: WithUnpackedHeaders<proto.GetBlocksRequest.$Properties>): Buffer =>
			Buffer.from(proto.GetBlocksRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.GetBlocksResponse.$Properties => {
			const decoded = proto.GetBlocksResponse.toObject(proto.GetBlocksResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: WithUnpackedHeaders<proto.GetBlocksResponse.$Properties>): Buffer =>
			Buffer.from(proto.GetBlocksResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
