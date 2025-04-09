import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { TransactionResource } from "../resources/index.js";

@injectable()
export class EthGetTransactionByBlockNumberAndIndex implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	public readonly name: string = "eth_getTransactionByBlockNumberAndIndex";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 2,
		minItems: 2,

		prefixItems: [{ $ref: "prefixedHex" }, { $ref: "prefixedHex" }],
		type: "array",
	};

	public async handle(parameters: [string, string]): Promise<any> {
		const transaction = await this.databaseService.getTransactionByBlockNumberAndIndex(
			Number.parseInt(parameters[0]),
			Number.parseInt(parameters[1]),
		);

		if (!transaction) {
			return null;
		}

		return this.app.resolve(TransactionResource).transform(transaction.data);
	}
}
