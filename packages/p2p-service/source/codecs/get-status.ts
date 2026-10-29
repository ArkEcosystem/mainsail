import { getStatus as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

export const getStatus = {
	request: {
		deserialize: (payload: Buffer): proto.GetStatusRequest.$Properties => {
			const decoded = proto.GetStatusRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: WithUnpackedHeaders<proto.GetStatusRequest.$Properties>): Buffer =>
			Buffer.from(proto.GetStatusRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.GetStatusResponse.$Properties => {
			const decoded = proto.GetStatusResponse.toObject(proto.GetStatusResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: WithUnpackedHeaders<proto.GetStatusResponse.$Properties>): Buffer =>
			Buffer.from(proto.GetStatusResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
