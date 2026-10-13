import { packHeadersBitmaps, unpackHeadersBitmaps } from "./headers.js";
import { postMessage as proto } from "./proto/protos.js";

export const postMessage = {
	request: {
		deserialize: (payload: Buffer): proto.IPostMessageRequest => {
			const decoded = proto.PostMessageRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return {
				...decoded,
				message: Buffer.from(decoded.message),
			};
		},
		serialize: (object: proto.IPostMessageRequest): Buffer =>
			Buffer.from(proto.PostMessageRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IPostMessageResponse => {
			const decoded = proto.PostMessageResponse.toObject(proto.PostMessageResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IPostMessageResponse): Buffer =>
			Buffer.from(proto.PostMessageResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
