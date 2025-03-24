import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class EthGetBlockTransactionCountByNumber implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_getBlockTransactionCountByNumber";

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 1,
		minItems: 1,

		prefixItems: [{ $ref: "prefixedHex" }],
		type: "array",
	};

	public async handle(parameters: [string]): Promise<string | null> {
		const block = await this.databaseService.getBlockHeader(Number(parameters[0]));

		if (!block) {
			// eslint-disable-next-line unicorn/no-null
			return null;
		}

		return `0x${block.transactionsCount.toString(16)}`;
	}
}
