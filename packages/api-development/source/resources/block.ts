import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Resource } from "../types";

@injectable()
export class BlockResource implements Resource {
	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	public raw(resource: Contracts.Crypto.IBlock): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public async transform(block: Contracts.Crypto.IBlock): Promise<object> {
		const blockData: Contracts.Crypto.IBlockData = block.data;
		const generator: Contracts.State.Wallet = await this.stateService
			.getWalletRepository()
			.findByPublicKey(blockData.generatorPublicKey);

		return {
			forged: {
				amount: blockData.totalAmount.toFixed(),
				fee: blockData.totalFee.toFixed(),
				reward: blockData.reward.toFixed(),
				total: blockData.reward.plus(blockData.totalFee).toFixed(),
			},
			generator: {
				address: generator.getAddress(),
				publicKey: generator.getPublicKey(),
				username: generator.hasAttribute("username") ? generator.getAttribute("username") : undefined,
			},
			height: +blockData.height,
			id: blockData.id,
			payload: {
				hash: blockData.payloadHash,
				length: blockData.payloadLength,
			},
			previous: blockData.previousBlock,
			timestamp: blockData.timestamp,
			transactions: blockData.numberOfTransactions,
			version: blockData.version,
		};
	}
}
