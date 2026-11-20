import { postMessage as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

type PostMessageRequest = WithUnpackedHeaders<proto.PostMessageRequest.$Properties> & { message: Buffer };

export const postMessage = {
	request: {
		deserialize: (payload: Buffer): PostMessageRequest => {
			const decoded = proto.PostMessageRequest.toObject(proto.PostMessageRequest.decode(payload), {
				defaults: true,
			});
			return {
				...unpackHeadersBitmaps(decoded),
				message: Buffer.from(decoded.message),
			};
		},
		serialize: (object: PostMessageRequest): Buffer =>
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
