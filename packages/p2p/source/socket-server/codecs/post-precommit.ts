import { postPrecommit as proto } from "./proto/protos";

export const postPrecommit = {
	request: {
		deserialize: (payload: Buffer) => {
			const decoded = proto.PostPrecommitRequest.decode(payload);
			return {
				...decoded,
				precommit: Buffer.from(decoded.prevote),
			};
		},
		serialize: (object: proto.IPostPrecommitRequest): Buffer =>
			Buffer.from(proto.PostPrecommitRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): {} => proto.PostPrecommitResponse.decode(payload),
		serialize: (object: proto.IPostPrecommitResponse): Buffer =>
			Buffer.from(proto.PostPrecommitResponse.encode(object).finish()),
	},
};
