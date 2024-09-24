import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class EthBlockNumberAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	public readonly name: string = "eth_blockNumber";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 0,
		type: "array",
	};

	public async handle(parameters: []): Promise<string> {
		return `0x${Number(this.stateStore.getLastHeight()).toString(16)}`;
	}
}
