import { postProposal as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

export const postProposal = {
	request: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.PostProposalRequest.$Properties> => {
			const decoded = proto.PostProposalRequest.decode(payload);
			return {
				...unpackHeadersBitmaps(decoded),
				proposal: Buffer.from(decoded.proposal),
			};
		},
		serialize: (object: WithUnpackedHeaders<proto.PostProposalRequest.$Properties>): Buffer =>
			Buffer.from(proto.PostProposalRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.PostProposalResponse.$Properties> => {
			const decoded = proto.PostProposalResponse.toObject(proto.PostProposalResponse.decode(payload), {
				defaults: true,
			});
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.PostProposalResponse.$Properties>): Buffer =>
			Buffer.from(proto.PostProposalResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
