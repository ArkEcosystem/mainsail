import { getProposal as proto } from "./proto/protos.js";

export const getProposal = {
	request: {
		deserialize: (payload: Buffer): proto.IGetProposalRequest => proto.GetProposalRequest.decode(payload),
		serialize: (object: proto.IGetProposalRequest): Buffer =>
			Buffer.from(proto.GetProposalRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetProposalResponse =>
			proto.GetProposalResponse.toObject(proto.GetProposalResponse.decode(payload), { defaults: true }),
		serialize: (object: proto.IGetProposalResponse): Buffer =>
			Buffer.from(proto.GetProposalResponse.encode(object).finish()),
	},
};
