import { Contracts } from "@mainsail/api-common";
import { Models } from "@mainsail/api-database";
import { injectable } from "@mainsail/container";
import { BigNumber } from "@mainsail/utils";

export interface BlockModel extends Models.Block {
	state: Models.State;
	generator: Models.Wallet;
}

@injectable()
export class BlockResource implements Contracts.Resource {
	public raw(resource: BlockModel): object {
		return { ...resource, state: undefined, generator: undefined };
	}

	public transform(resource: BlockModel): object {
		return {
			forged: {
				amount: BigNumber.make(resource.totalAmount),
				fee: resource.totalFee,
				reward: resource.reward,
				total: BigNumber.make(resource.reward).plus(resource.totalFee).toFixed(),
			},
			generator: {
				username: resource.generator.attributes?.["validatorUsername"] ?? undefined,
				address: resource.generator.address,
				publicKey: resource.generator.publicKey,
			},
			height: +resource.height,
			id: resource.id,
			payload: {
				hash: resource.payloadHash,
				length: resource.payloadLength,
			},
			previous: resource.previousBlock,
			signature: resource.signature,
			timestamp: Math.trunc(+resource.timestamp / 1000),
			confirmations: +resource.state.height ? Number(resource.state.height) - Number(resource.height) : 0,
			transactions: resource.numberOfTransactions,

			version: resource.version,
		};
	}
}
