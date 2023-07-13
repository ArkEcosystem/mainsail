import { getProposal as proto } from "./proto/protos";

export const getProposal = {
	request: {
		deserialize: (payload: Buffer): proto.IGetProposalRequest => proto.GetProposalRequest.decode(payload),
		serialize: (object: proto.IGetProposalRequest): Buffer =>
			Buffer.from(proto.GetProposalRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetProposalResponse =>
			proto.GetProposalResponse.decode(payload).toJSON(),
		serialize: (object: proto.IGetProposalResponse): Buffer =>
			Buffer.from(proto.GetProposalResponse.encode(object).finish()),
	},
};
