import Contracts from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

import { peer } from "./proto/protos";

export const getPeers = {
	request: {
		deserialize: (payload: Buffer): {} => peer.GetPeersRequest.decode(payload),
		serialize: (object: peer.GetPeersRequest): Buffer => Buffer.from(peer.GetPeersRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): Contracts.P2P.PeerBroadcast[] =>
			peer.GetPeersResponse.decode(payload).peers as Contracts.P2P.PeerBroadcast[],
		serialize: (peers: Contracts.P2P.PeerBroadcast[]): Buffer =>
			Buffer.from(peer.GetPeersResponse.encode({ peers }).finish()),
	},
};

export const getCommonBlocks = {
	request: {
		deserialize: (payload: Buffer): peer.IGetCommonBlocksRequest => peer.GetCommonBlocksRequest.decode(payload),
		serialize: (object: peer.IGetCommonBlocksRequest): Buffer =>
			Buffer.from(peer.GetCommonBlocksRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): peer.IGetCommonBlocksResponse => peer.GetCommonBlocksResponse.decode(payload),
		serialize: (object: peer.IGetCommonBlocksResponse): Buffer =>
			Buffer.from(peer.GetCommonBlocksResponse.encode(object).finish()),
	},
};

export const getStatus = {
	request: {
		deserialize: (payload: Buffer): {} => peer.GetStatusRequest.decode(payload),
		serialize: (object: peer.GetStatusRequest): Buffer =>
			Buffer.from(peer.GetStatusRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): Contracts.P2P.PeerPingResponse => {
			const decoded = peer.GetStatusResponse.decode(payload);
			const totalAmount = new BigNumber(decoded.state.header.totalAmount);
			const totalFee = new BigNumber(decoded.state.header.totalFee);
			const reward = new BigNumber(decoded.state.header.reward);

			return {
				...decoded,
				state: {
					...decoded.state,
					header: {
						...decoded.state?.header,
						reward,
						totalAmount,
						totalFee,
					},
				},
			} as Contracts.P2P.PeerPingResponse;
		},
		serialize: (object: Contracts.P2P.PeerPingResponse): Buffer => {
			object.state.header.totalAmount = object.state.header.totalAmount.toString();
			object.state.header.totalFee = object.state.header.totalFee.toString();
			object.state.header.reward = object.state.header.reward.toString();
			return Buffer.from(peer.GetStatusResponse.encode(object).finish());
		},
	},
};
