import type * as types from "./proto/protos.d.ts";
import * as _protos from "./proto/protos.js";

const proto = (_protos as any).default.postProposal as typeof types.postProposal;

export const postProposal = {
	request: {
		deserialize: (payload: Buffer) => {
			const decoded = proto.PostProposalRequest.decode(payload);
			return {
				...decoded,
				proposal: Buffer.from(decoded.proposal),
			};
		},
		serialize: (object: types.postProposal.IPostProposalRequest): Buffer =>
			Buffer.from(proto.PostProposalRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): {} =>
			proto.PostProposalResponse.toObject(proto.PostProposalResponse.decode(payload), { defaults: true }),
		serialize: (object: types.postProposal.IPostProposalResponse): Buffer =>
			Buffer.from(proto.PostProposalResponse.encode(object).finish()),
	},
};
