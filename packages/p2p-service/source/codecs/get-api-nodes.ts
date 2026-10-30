import { getApiNodes as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

export const getApiNodes = {
	request: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.GetApiNodesRequest.$Properties> => {
			const decoded = proto.GetApiNodesRequest.decode(payload);
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.GetApiNodesRequest.$Properties>): Buffer =>
			Buffer.from(proto.GetApiNodesRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.GetApiNodesResponse.$Properties> => {
			const decoded = proto.GetApiNodesResponse.toObject(proto.GetApiNodesResponse.decode(payload), {
				defaults: true,
			});
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.GetApiNodesResponse.$Properties>): Buffer =>
			Buffer.from(proto.GetApiNodesResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
