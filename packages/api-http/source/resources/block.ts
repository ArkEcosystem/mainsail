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
			confirmations: 0,
			forged: {
				amount: resource.totalAmount,
				fee: resource.totalFee,
				reward: resource.reward,
				// total: blockData.reward.plus(blockData.totalFee).toFixed(),
			},
			generator: {
				// username: generator.hasAttribute("delegate.username")
				//     ? generator.getAttribute("delegate.username")
				//     : undefined,
				// address: generator.getAddress(),
				// publicKey: generator.getPublicKey(),
			},
			height: +resource.height,
			id: resource.id,
			payload: {
				hash: resource.payloadHash,
				length: resource.payloadLength,
			},
			previous: resource.previousBlock,
			signature: resource.signature,
			timestamp: +resource.timestamp,
			// lastBlock ? lastBlock.data.height - blockData.height : 0,
			transactions: resource.numberOfTransactions,

			version: resource.version,
		};
	}
}
