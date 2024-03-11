import { postPrecommit as proto } from "./proto/protos.js";

export const postPrecommit = {
	request: {
		deserialize: (payload: Buffer) => {
			const decoded = proto.PostPrecommitRequest.decode(payload);
			return {
				...decoded,
				precommit: Buffer.from(decoded.precommit),
			};
		},
		serialize: (object: proto.IPostPrecommitRequest): Buffer =>
			Buffer.from(proto.PostPrecommitRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): {} =>
			proto.PostPrecommitResponse.toObject(proto.PostPrecommitResponse.decode(payload), { defaults: true }),
		serialize: (object: proto.IPostPrecommitResponse): Buffer =>
			Buffer.from(proto.PostPrecommitResponse.encode(object).finish()),
	},
};
