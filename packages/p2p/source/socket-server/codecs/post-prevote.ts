import type * as types from "./proto/protos.d.ts";
import * as _protos from "./proto/protos.js";

const proto = (_protos as any).default.postPrevote as typeof types.postPrevote;

export const postPrevote = {
	request: {
		deserialize: (payload: Buffer) => {
			const decoded = proto.PostPrevoteRequest.decode(payload);
			return {
				...decoded,
				prevote: Buffer.from(decoded.prevote),
			};
		},
		serialize: (object: types.postPrevote.IPostPrevoteRequest): Buffer =>
			Buffer.from(proto.PostPrevoteRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): {} =>
			proto.PostPrevoteResponse.toObject(proto.PostPrevoteResponse.decode(payload), {
				defaults: true,
			}),
		serialize: (object: types.postPrevote.IPostPrevoteResponse): Buffer =>
			Buffer.from(proto.PostPrevoteResponse.encode(object).finish()),
	},
};
