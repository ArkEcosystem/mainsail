import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";
import { postMessage as proto } from "./proto/protos.js";

export const postMessage = {
	request: {
		deserialize: (payload: Buffer): proto.PostMessageRequest.$Properties => {
			const decoded = proto.PostMessageRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return {
				...decoded,
				message: Buffer.from(decoded.message),
			};
		},
		serialize: (object: WithUnpackedHeaders<proto.PostMessageRequest.$Properties>): Buffer =>
			Buffer.from(proto.PostMessageRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.PostMessageResponse.$Properties => {
			const decoded = proto.PostMessageResponse.toObject(proto.PostMessageResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: WithUnpackedHeaders<proto.PostMessageResponse.$Properties>): Buffer =>
			Buffer.from(proto.PostMessageResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
