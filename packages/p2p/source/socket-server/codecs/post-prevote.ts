import { postMessage as proto } from "./proto/protos.js";

export const postPrevote = {
	request: {
		deserialize: (payload: Buffer): proto.IPostMessageRequest => {
			const decoded = proto.PostMessageRequest.decode(payload);
			return {
				...decoded,
				prevote: Buffer.from(decoded.prevote),
			};
		},
		serialize: (object: proto.IPostMessageRequest): Buffer =>
			Buffer.from(proto.PostMessageRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IPostPrevoteResponse =>
			proto.PostPrevoteResponse.toObject(proto.PostPrevoteResponse.decode(payload), {
				defaults: true,
			}),
		serialize: (object: proto.IPostPrevoteResponse): Buffer =>
			Buffer.from(proto.PostPrevoteResponse.encode(object).finish()),
	},
};
