import { getBlocks as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

export const getBlocks = {
	request: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.GetBlocksRequest.$Properties> => {
			const decoded = proto.GetBlocksRequest.decode(payload);
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.GetBlocksRequest.$Properties>): Buffer =>
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
