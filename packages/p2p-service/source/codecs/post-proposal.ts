import { postProposal as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

type PostProposalRequest = WithUnpackedHeaders<proto.PostProposalRequest.$Properties> & { proposal: Buffer };

export const postProposal = {
	request: {
		deserialize: (payload: Buffer): PostProposalRequest => {
			const decoded = proto.PostProposalRequest.toObject(proto.PostProposalRequest.decode(payload), {
				defaults: true,
			});
			return {
				...unpackHeadersBitmaps(decoded),
				proposal: Buffer.from(decoded.proposal),
			};
		},
		serialize: (object: PostProposalRequest): Buffer =>
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
