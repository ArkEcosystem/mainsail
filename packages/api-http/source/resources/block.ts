import { Contracts } from "@mainsail/api-common";
import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class BlockResource implements Contracts.Resource {
	public raw(resource: Models.Block): object {
		return resource;
	}

	public transform(resource: Models.Block): object {
		return {
			confirmations: 0,
			forged: {
				amount: BigNumber.make(resource.totalAmount),
				fee: resource.totalFee,
				reward: resource.reward,
				total: BigNumber.make(resource.reward).plus(resource.totalFee).toFixed(),
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
