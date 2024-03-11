import type * as types from "./proto/protos.d.ts";
import * as _protos from "./proto/protos.js";

const proto = (_protos as any).default.getProposal as typeof types.getProposal;

export const getProposal = {
	request: {
		deserialize: (payload: Buffer): types.getProposal.IGetProposalRequest =>
			proto.GetProposalRequest.decode(payload),
		serialize: (object: types.getProposal.IGetProposalRequest): Buffer =>
			Buffer.from(proto.GetProposalRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): types.getProposal.IGetProposalResponse =>
			proto.GetProposalResponse.toObject(proto.GetProposalResponse.decode(payload), {
				defaults: true,
			}),
		serialize: (object: types.getProposal.IGetProposalResponse): Buffer =>
			Buffer.from(proto.GetProposalResponse.encode(object).finish()),
	},
};
