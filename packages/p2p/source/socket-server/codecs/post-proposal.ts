import { postProposal as proto } from "./proto/protos";

export const postProposal = {
	request: {
		deserialize: (payload: Buffer) => {
			const decoded = proto.PostProposalRequest.decode(payload);
			return {
				...decoded,
				block: Buffer.from(decoded.proposal),
			};
		},
		serialize: (object: proto.IPostProposalRequest): Buffer =>
			Buffer.from(proto.PostProposalRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): {} => proto.PostProposalResponse.decode(payload),
		serialize: (object: proto.IPostProposalResponse): Buffer =>
			Buffer.from(proto.PostProposalResponse.encode(object).finish()),
	},
};
