import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { RpcError } from "@mainsail/exceptions";

@injectable()
export class EthGetUncleByBlockHashAndIndex implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	public readonly name: string = "eth_getUncleByBlockHashAndIndex";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 2,
		minItems: 2,

		prefixItems: [{ $ref: "prefixedBlockHash" }, { $ref: "prefixedQuantityHex" }],
		type: "array",
	};

	public async handle(parameters: [string]): Promise<null> {
		if (!(await this.databaseService.hasCommitByHash(parameters[0].slice(2)))) {
			throw new RpcError("Block not found");
		}

		// eslint-disable-next-line unicorn/no-null
		return null;
	}
}
