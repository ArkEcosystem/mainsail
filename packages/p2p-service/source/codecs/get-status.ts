import { getStatus as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

export const getStatus = {
	request: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.GetStatusRequest.$Properties> => {
			const decoded = proto.GetStatusRequest.decode(payload);
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.GetStatusRequest.$Properties>): Buffer =>
			Buffer.from(proto.GetStatusRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.GetStatusResponse.$Properties> => {
			const decoded = proto.GetStatusResponse.toObject(proto.GetStatusResponse.decode(payload), {
				defaults: true,
			});
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.GetStatusResponse.$Properties>): Buffer =>
			Buffer.from(proto.GetStatusResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
