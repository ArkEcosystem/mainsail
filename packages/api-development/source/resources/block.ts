import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class BlockResource implements Contracts.Api.Resource {
	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	public raw(resource: Contracts.Crypto.Block): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public async transform(block: Contracts.Crypto.Block): Promise<object> {
		const blockData: Contracts.Crypto.BlockData = block.data;
		const generator: Contracts.State.Wallet = await this.stateService
			.getStore()
			.walletRepository.findByPublicKey(blockData.generatorPublicKey);

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
