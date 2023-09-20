import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

import { Resource } from "../types";

@injectable()
export class BlockResource implements Resource {
	public raw(resource: Models.Block): object {
		return resource;
	}

	public transform(resource: Models.Block): object {
		return {
			id: resource.id,
			version: resource.version,
			height: +resource.height,
			previous: resource.previousBlock,
			forged: {
				reward: resource.reward,
				fee: resource.totalFee,
				amount: resource.totalAmount,
				// total: blockData.reward.plus(blockData.totalFee).toFixed(),
			},
			payload: {
				hash: resource.payloadHash,
				length: resource.payloadLength,
			},
			generator: {
				// username: generator.hasAttribute("delegate.username")
				//     ? generator.getAttribute("delegate.username")
				//     : undefined,
				// address: generator.getAddress(),
				// publicKey: generator.getPublicKey(),
			},
			signature: resource.signature,
			confirmations: 0, // lastBlock ? lastBlock.data.height - blockData.height : 0,
			transactions: resource.numberOfTransactions,
			timestamp: +resource.timestamp,
		};
	}
}
