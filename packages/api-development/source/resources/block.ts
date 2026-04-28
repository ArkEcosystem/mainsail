import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";

@injectable()
export class BlockResource implements Contracts.Api.Resource {
	public raw(resource: Contracts.Crypto.Block): object {
		return JSON.parse(JSON.stringify(resource));
	}

	public async transform(block: Contracts.Crypto.Block): Promise<object> {
		return {
			forged: {
				fee: block.fee.toString(),
				reward: block.reward.toString(),
				total: (block.reward + block.fee).toString(),
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
