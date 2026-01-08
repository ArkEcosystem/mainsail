import { postMessage as proto } from "./proto/protos.js";

export const postMessage = {
	request: {
		deserialize: (payload: Buffer): proto.IPostMessageRequest => {
			const decoded = proto.PostMessageRequest.decode(payload);
			return {
				...decoded,
				message: Buffer.from(decoded.message),
			};
		},
		serialize: (object: proto.IPostMessageRequest): Buffer =>
			Buffer.from(proto.PostMessageRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IPostMessageResponse =>
			proto.PostMessageResponse.toObject(proto.PostMessageResponse.decode(payload), {
				defaults: true,
			}),
		serialize: (object: proto.IPostMessageResponse): Buffer =>
			Buffer.from(proto.PostMessageResponse.encode(object).finish()),
	},
};
