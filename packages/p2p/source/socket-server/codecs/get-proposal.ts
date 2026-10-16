import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";
import { getProposal as proto } from "./proto/protos.js";

export const getProposal = {
	request: {
		deserialize: (payload: Buffer): proto.GetProposalRequest.$Properties => {
			const decoded = proto.GetProposalRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: WithUnpackedHeaders<proto.GetProposalRequest.$Properties>): Buffer =>
			Buffer.from(proto.GetProposalRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.GetProposalResponse.$Properties => {
			const decoded = proto.GetProposalResponse.toObject(proto.GetProposalResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: WithUnpackedHeaders<proto.GetProposalResponse.$Properties>): Buffer =>
			Buffer.from(proto.GetProposalResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
