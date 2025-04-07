import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

export interface EnrichedBlock extends Models.Block {
	state: Models.State;
	generator: Models.Wallet;
}

@injectable()
export class BlockResource implements Contracts.Api.Resource {
	public raw(resource: EnrichedBlock): object {
		return { ...resource, generator: undefined, state: undefined };
	}

	public transform(resource: EnrichedBlock): object {
		return {
			confirmations: +resource.state.blockNumber
				? Number(resource.state.blockNumber) - Number(resource.number)
				: 0,
			forged: {
				amount: BigNumber.make(resource.amount),
				fee: resource.fee,
				reward: resource.reward,
				total: BigNumber.make(resource.reward).plus(resource.fee).toFixed(),
			},
			generator: {
				address: resource.generator.address,
				publicKey: resource.generator.publicKey,
				username: resource.generator.attributes?.["username"] ?? undefined,
			},
			hash: resource.hash,
			height: +resource.number,
			payload: {
				hash: resource.transactionsRoot,
				length: resource.payloadSize,
			},
			previous: resource.parentHash,
			signature: resource.signature,
			timestamp: +resource.timestamp,
			transactions: resource.transactionsCount,

			version: resource.version,
		};
	}
}
