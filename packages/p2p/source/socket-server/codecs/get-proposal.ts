import { packHeadersBitmaps, unpackHeadersBitmaps } from "./headers.js";
import { getProposal as proto } from "./proto/protos.js";

export const getProposal = {
	request: {
		deserialize: (payload: Buffer): proto.IGetProposalRequest => {
			const decoded = proto.GetProposalRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IGetProposalRequest): Buffer =>
			Buffer.from(proto.GetProposalRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.IGetProposalResponse => {
			const decoded = proto.GetProposalResponse.toObject(proto.GetProposalResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: proto.IGetProposalResponse): Buffer =>
			Buffer.from(proto.GetProposalResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
