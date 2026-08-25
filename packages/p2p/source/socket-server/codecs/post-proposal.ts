import { packHeadersBitmaps, unpackHeadersBitmaps } from "./headers.js";
import { postProposal as proto } from "./proto/protos.js";

export const postProposal = {
	request: {
		deserialize: (payload: Buffer): proto.IPostProposalRequest => {
			const decoded = proto.PostProposalRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return {
				...decoded,
				proposal: Buffer.from(decoded.proposal),
			};
		},
		serialize: (object: proto.IPostProposalRequest): Buffer =>
			Buffer.from(proto.PostProposalRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IPostProposalResponse => {
			const decoded = proto.PostProposalResponse.toObject(proto.PostProposalResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IPostProposalResponse): Buffer =>
			Buffer.from(proto.PostProposalResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
