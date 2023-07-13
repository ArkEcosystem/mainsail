import { postPrevote as proto } from "./proto/protos";

export const postPrevote = {
	request: {
		deserialize: (payload: Buffer) => {
			const decoded = proto.PostPrevoteRequest.decode(payload);
			return {
				...decoded,
				prevote: Buffer.from(decoded.prevote),
			};
		},
		serialize: (object: proto.IPostPrevoteRequest): Buffer =>
			Buffer.from(proto.PostPrevoteRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): {} => proto.PostPrevoteResponse.decode(payload).toJSON(),
		serialize: (object: proto.IPostPrevoteResponse): Buffer =>
			Buffer.from(proto.PostPrevoteResponse.encode(object).finish()),
	},
};
