import { Contracts } from "@mainsail/core-contracts";

import { postBlock as proto } from "./proto/protos";

export const postBlock = {
	request: {
		deserialize: (payload: Buffer) => {
			const decoded = proto.PostBlockRequest.decode(payload);
			return {
				...decoded,
				block: Buffer.from(decoded.block),
			};
		},
		serialize: (object: proto.IPostBlockRequest): Buffer =>
			Buffer.from(proto.PostBlockRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): Contracts.P2P.PostBlockResponse => proto.PostBlockResponse.decode(payload),
		serialize: (object: proto.IPostBlockResponse): Buffer =>
			Buffer.from(proto.PostBlockResponse.encode(object).finish()),
	},
};
