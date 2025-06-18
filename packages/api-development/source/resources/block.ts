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
				fee: blockData.fee.toFixed(),
				reward: blockData.reward.toFixed(),
				total: blockData.reward.plus(blockData.fee).toFixed(),
			},
			// TODO: Fix
			// generator: {
			// 	address: generator.getAddress(),
			// 	publicKey: generator.getPublicKey(),
			// 	username: generator.hasAttribute("username") ? generator.getAttribute("username") : undefined,
			// },
			height: +blockData.number,
			id: blockData.hash,
			payload: {
				hash: blockData.transactionsRoot,
				length: blockData.payloadSize,
			},
			previous: blockData.parentHash,
			timestamp: blockData.timestamp,
			transactions: blockData.transactionsCount,
			version: blockData.version,
		};
	}
}
