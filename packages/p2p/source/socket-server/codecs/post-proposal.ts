import { postProposal as proto } from "./proto/protos.js";

export const postProposal = {
	request: {
		deserialize: (payload: Buffer): proto.IPostProposalRequest => {
			const decoded = proto.PostProposalRequest.decode(payload);
			return {
				...decoded,
				proposal: Buffer.from(decoded.proposal),
			};
		},
		serialize: (object: proto.IPostProposalRequest): Buffer =>
			Buffer.from(proto.PostProposalRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): Record<string, any> =>
			proto.PostProposalResponse.toObject(proto.PostProposalResponse.decode(payload), { defaults: true }),
		serialize: (object: proto.IPostProposalResponse): Buffer =>
			Buffer.from(proto.PostProposalResponse.encode(object).finish()),
	},
};
