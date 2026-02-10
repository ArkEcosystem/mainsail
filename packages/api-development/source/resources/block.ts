import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class BlockResource implements Contracts.Api.Resource {
	public raw(resource: Contracts.Crypto.Block): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public async transform(block: Contracts.Crypto.Block): Promise<object> {
		return {
			forged: {
				fee: block.fee.toFixed(),
				reward: block.reward.toFixed(),
				total: block.reward.plus(block.fee).toFixed(),
			},
			// TODO: Fix
			// generator: {
			// 	address: generator.getAddress(),
			// 	publicKey: generator.getPublicKey(),
			// 	username: generator.hasAttribute("username") ? generator.getAttribute("username") : undefined,
			// },
			height: +block.number,
			id: block.hash,
			payload: {
				hash: block.transactionsRoot,
				length: block.payloadSize,
			},
			previous: block.parentHash,
			timestamp: block.timestamp,
			transactions: block.transactionsCount,
			version: block.version,
		};
	}
}
