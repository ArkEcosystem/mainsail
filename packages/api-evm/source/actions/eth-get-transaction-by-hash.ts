import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { TransactionResource } from "../resources/index.js";

@injectable()
export class EthGetTransactionByHash implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	public readonly name: string = "eth_getTransactionByHash";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 1,
		minItems: 1,

		prefixItems: [{ $ref: "prefixedHex" }], // TODO: Use transaction id
		type: "array",
	};

	public async handle(parameters: [string]): Promise<any> {
		const transaction = await this.databaseService.getTransactionById(parameters[0].slice(2));

		if (!transaction) {
			return null;
		}

		return this.app.resolve(TransactionResource).transform(transaction.data);
	}
}
