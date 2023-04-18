import { Contracts } from "@arkecosystem/core-contracts";

import { blocks } from "./proto/protos";

export const postBlock = {
	request: {
		deserialize: (payload: Buffer) => {
			const decoded = blocks.PostBlockRequest.decode(payload);
			return {
				...decoded,
				block: Buffer.from(decoded.block),
			};
		},
		serialize: (object: blocks.IPostBlockRequest): Buffer =>
			Buffer.from(blocks.PostBlockRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): Contracts.P2P.PostBlockResponse => blocks.PostBlockResponse.decode(payload),
		serialize: (object: blocks.IPostBlockResponse): Buffer =>
			Buffer.from(blocks.PostBlockResponse.encode(object).finish()),
	},
};
