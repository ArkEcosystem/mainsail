import type { Contracts } from "@mainsail/contracts";

import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";

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
			fee: resource.fee,
			gasUsed: resource.gasUsed,
			hash: resource.hash,
			number: +resource.number,
			parentHash: resource.parentHash,
			payloadSize: resource.payloadSize,
			proposer: resource.proposer,
			publicKey: resource.generator.publicKey,
			reward: resource.reward,
			round: resource.round,
			signature: resource.signature,
			timestamp: resource.timestamp,
			total: (resource.reward + resource.fee).toString(),
			transactionsCount: resource.transactionsCount,
			transactionsRoot: resource.transactionsRoot,
			username: resource.generator.attributes?.["username"] ?? undefined,
			validatorSet: resource.validatorSet,

			version: resource.version,
		};
	}
}
