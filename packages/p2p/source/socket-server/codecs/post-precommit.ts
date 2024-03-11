import type * as types from "./proto/protos.d.ts";
import * as _protos from "./proto/protos.js";

const proto = (_protos as any).default.postPrecommit as typeof types.postPrecommit;

export const postPrecommit = {
	request: {
		deserialize: (payload: Buffer) => {
			const decoded = proto.PostPrecommitRequest.decode(payload);
			return {
				...decoded,
				precommit: Buffer.from(decoded.precommit),
			};
		},
		serialize: (object: types.postPrecommit.IPostPrecommitRequest): Buffer =>
			Buffer.from(proto.PostPrecommitRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): {} =>
			proto.PostPrecommitResponse.toObject(proto.PostPrecommitResponse.decode(payload), { defaults: true }),
		serialize: (object: types.postPrecommit.IPostPrecommitResponse): Buffer =>
			Buffer.from(proto.PostPrecommitResponse.encode(object).finish()),
	},
};
