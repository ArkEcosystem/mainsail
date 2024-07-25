import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class EthBlockNumberAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	public readonly name: string = "eth_blockNumber";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 0,
		type: "array",
	};

	public async handle(parameters: []): Promise<string> {
		return `0x${Number(this.stateService.getStore().getLastHeight()).toString(16)}`;
	}
}
