import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import Hapi from "@hapi/hapi";

import { Controller } from "../../types";
import { getPeerConfig } from "../utils/get-peer-config";
@injectable()
export class GetStatusController implements Controller {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots!: Contracts.Crypto.Slots;

	public async handle(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Contracts.P2P.PeerPingResponse> {
		const lastBlock: Contracts.Crypto.IBlock = this.blockchain.getLastBlock();

		const slotInfo = await this.slots.getSlotInfo();

		return {
			config: getPeerConfig(this.app),
			state: {
				currentSlot: slotInfo.slotNumber,
				forgingAllowed: slotInfo.forgingStatus,
				header: lastBlock.header,
				height: lastBlock.data.height,
			},
		};
	}
}
