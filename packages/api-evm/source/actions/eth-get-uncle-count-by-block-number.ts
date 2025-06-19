import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class EthGetUncleCountByBlockNumber implements Contracts.Api.RPC.Action {
	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	public readonly name: string = "eth_getUncleCountByBlockNumber";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 1,
		minItems: 1,

		prefixItems: [{ $ref: "prefixedQuantityHex" }],
		type: "array",
	};

	public async handle(parameters: [string]): Promise<string> {
		if (this.stateStore.getBlockNumber() < Number(parameters[0])) {
			throw new Exceptions.RpcError("Block not found");
		}

		return `0x0`;
	}
}
