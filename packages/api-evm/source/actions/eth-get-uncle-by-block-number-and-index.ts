import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class EthGetUncleByBlockNumberAndIndex implements Contracts.Api.RPC.Action {
	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	public readonly name: string = "eth_getUncleByBlockNumberAndIndex";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 2,
		minItems: 2,

		prefixItems: [{ $ref: "prefixedQuantityHex" }, { $ref: "prefixedQuantityHex" }],
		type: "array",
	};

	public async handle(parameters: [string]): Promise<null> {
		if (this.stateStore.getBlockNumber() < Number(parameters[0])) {
			throw new Exceptions.RpcError("Block not found");
		}

		// eslint-disable-next-line unicorn/no-null
		return null;
	}
}
