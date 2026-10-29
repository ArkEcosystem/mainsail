import { getProposal as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

export const getProposal = {
	request: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.GetProposalRequest.$Properties> => {
			const decoded = proto.GetProposalRequest.decode(payload);
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.GetProposalRequest.$Properties>): Buffer =>
			Buffer.from(proto.GetProposalRequest.encode(packHeadersBitmaps(object)).finish()),
	},
	response: {
		deserialize: (payload: Buffer): WithUnpackedHeaders<proto.GetProposalResponse.$Properties> => {
			const decoded = proto.GetProposalResponse.toObject(proto.GetProposalResponse.decode(payload), {
				defaults: true,
			});
			return unpackHeadersBitmaps(decoded);
		},
		serialize: (object: WithUnpackedHeaders<proto.GetProposalResponse.$Properties>): Buffer =>
			Buffer.from(proto.GetProposalResponse.encode(packHeadersBitmaps(object)).finish()),
	},
};
