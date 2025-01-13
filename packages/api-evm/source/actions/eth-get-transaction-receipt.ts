import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class EthGetTransactionReceipt implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_getTransactionReceipt";

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	// @inject(Identifiers.Evm.Instance)
	// @tagged("instance", "evm") // TODO: Check ephemeral
	// private readonly evm!: Contracts.Evm.Instance;

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 1,
		minItems: 1,

		prefixItems: [
			{ $ref: "prefixedHex" }, // TODO: Extract transaction id
		],
		type: "array",
	};

	public async handle(parameters: [string, boolean]): Promise<object | null> {
		const transaction = await this.databaseService.getTransactionById(parameters[0].slice(2));

		if (!transaction) {
			return null;
		}

		return null;
	}
}
