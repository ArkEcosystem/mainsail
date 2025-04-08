import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class EthGetBlockTransactionCountByHash implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_getBlockTransactionCountByHash";

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 1,
		minItems: 1,

		prefixItems: [{ $ref: "prefixedBlockHash" }],
		type: "array",
	};

	public async handle(parameters: [string]): Promise<string | null> {
		const block = await this.databaseService.getBlockHeaderById(parameters[0].slice(2));

		if (!block) {
			// eslint-disable-next-line unicorn/no-null
			return null;
		}

		return `0x${block.transactionsCount.toString(16)}`;
	}
}
