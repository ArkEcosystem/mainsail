import { postMessage as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

export const postMessage = {
	request: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.PostMessageRequest.$Properties> => {
			const decoded = proto.PostMessageRequest.decode(payload);
			return {
				...unpackHeadersBitmaps(decoded),
				message: Buffer.from(decoded.message),
			};
		},
		serialize: (object: WithUnpackedHeaders<proto.PostMessageRequest.$Properties>): Buffer =>
			Buffer.from(proto.PostMessageRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.PostMessageResponse.$Properties> => {
			const decoded = proto.PostMessageResponse.toObject(proto.PostMessageResponse.decode(payload), {
				defaults: true,
			});
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.PostMessageResponse.$Properties>): Buffer =>
			Buffer.from(proto.PostMessageResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
