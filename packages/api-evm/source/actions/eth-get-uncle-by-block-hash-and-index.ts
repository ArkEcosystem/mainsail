import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class EthGetUncleByBlockHashAndIndex implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	public readonly name: string = "eth_getUncleByBlockHashAndIndex";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 2,
		minItems: 2,

		prefixItems: [{ $ref: "prefixedBlockId" }, { $ref: "prefixedHex" }],
		type: "array",
	};

	public async handle(parameters: [string]): Promise<null> {
		if (!(await this.databaseService.hasCommitById(parameters[0].slice(2)))) {
			throw new Exceptions.RpcError("Block not found");
		}

		// eslint-disable-next-line unicorn/no-null
		return null;
	}
}
