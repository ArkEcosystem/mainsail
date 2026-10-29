import { postProposal as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

export const postProposal = {
	request: {
		deserialize: (payload: Buffer): proto.PostProposalRequest.$Properties => {
			const decoded = proto.PostProposalRequest.decode(payload);
			unpackHeadersBitmaps(decoded);
			return {
				...decoded,
				proposal: Buffer.from(decoded.proposal),
			};
		},
		serialize: (object: WithUnpackedHeaders<proto.PostProposalRequest.$Properties>): Buffer =>
			Buffer.from(proto.PostProposalRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): proto.PostProposalResponse.$Properties => {
			const decoded = proto.PostProposalResponse.toObject(proto.PostProposalResponse.decode(payload), {
				defaults: true,
			});
			unpackHeadersBitmaps(decoded);
			return decoded;
		},
		serialize: (object: WithUnpackedHeaders<proto.PostProposalResponse.$Properties>): Buffer =>
			Buffer.from(proto.PostProposalResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
