import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

export interface BlockModel extends Models.Block {
	state: Models.State;
	generator: Models.Wallet;
}

@injectable()
export class BlockResource implements Contracts.Api.Resource {
	public raw(resource: BlockModel): object {
		return { ...resource, generator: undefined, state: undefined };
	}

	public transform(resource: BlockModel): object {
		return {
			confirmations: +resource.state.height ? Number(resource.state.height) - Number(resource.height) : 0,
			forged: {
				amount: BigNumber.make(resource.totalAmount),
				fee: resource.totalFee,
				reward: resource.reward,
				total: BigNumber.make(resource.reward).plus(resource.totalFee).toFixed(),
			},
			generator: {
				address: resource.generator.address,
				publicKey: resource.generator.publicKey,
				username: resource.generator.attributes?.["username"] ?? undefined,
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
			transactions: resource.numberOfTransactions,

			version: resource.version,
		};
	}
}
