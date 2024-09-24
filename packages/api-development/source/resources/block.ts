import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class BlockResource implements Contracts.Api.Resource {
	public raw(resource: Contracts.Crypto.Block): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public async transform(block: Contracts.Crypto.Block): Promise<object> {
		const blockData: Contracts.Crypto.BlockData = block.data;

		return {
			forged: {
				amount: blockData.totalAmount.toFixed(),
				fee: blockData.totalFee.toFixed(),
				reward: blockData.reward.toFixed(),
				total: blockData.reward.plus(blockData.totalFee).toFixed(),
			},
			// TODO: Fix
			// generator: {
			// 	address: generator.getAddress(),
			// 	publicKey: generator.getPublicKey(),
			// 	username: generator.hasAttribute("username") ? generator.getAttribute("username") : undefined,
			// },
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
