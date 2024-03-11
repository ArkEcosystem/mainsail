import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { getStatus as proto } from "./proto/protos.js";

export const getStatus = {
	request: {
		deserialize: (payload: Buffer): {} => proto.GetStatusRequest.decode(payload),
		serialize: (object: proto.GetStatusRequest): Buffer =>
			Buffer.from(proto.GetStatusRequest.encode(object).finish()),
	},
	response: {
		deserialize: (payload: Buffer): Contracts.P2P.PeerPingResponse => {
			const decoded = proto.GetStatusResponse.decode(payload).toJSON();

			Utils.assert.defined<string>(decoded.state?.header?.totalAmount);
			Utils.assert.defined<string>(decoded.state?.header?.totalFee);
			Utils.assert.defined<string>(decoded.state?.header?.reward);

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
			return Buffer.from(proto.GetStatusResponse.encode(object).finish());
		},
	},
};
