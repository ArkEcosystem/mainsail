import type { Contracts } from "@mainsail/contracts";

import { getProposal as proto } from "../../protos/protos.js";
import { packHeadersBitmaps, unpackHeadersBitmaps, type WithUnpackedHeaders } from "./headers.js";

type GetProposalRequest = WithUnpackedHeaders<proto.GetProposalRequest.$Properties> & {
	query: Contracts.P2PService.GetProposalQuery;
};

export const getProposal = {
	request: {
		deserialize: (payload: Buffer): GetProposalRequest => {
			const decoded = proto.GetProposalRequest.toObject(proto.GetProposalRequest.decode(payload), {
				defaults: true,
			});
			return unpackHeadersBitmaps(decoded) as GetProposalRequest;
		},
		serialize: (object: GetProposalRequest): Buffer =>
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
