import { inject, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

export abstract class TransactionTriggerAction extends Services.Triggers.Action {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "mock")
	protected readonly evm!: Contracts.Evm.Instance;

	protected mockEvmContext(): { instance: Contracts.Evm.Instance; blockContext: Contracts.Evm.BlockContext } {
		return {
			blockContext: {
				commitKey: { height: BigInt(0), round: BigInt(0) },
				gasLimit: BigInt(0),
				timestamp: BigInt(0),
				validatorAddress: "0x0000000000000000000000000000000000000000",
			},
			instance: this.evm,
		};
	}
}
