import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { BlockResource } from "../resources/index.js";

@injectable()
export class EthGetBlockByHashAction implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_getBlockByHash";

	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 2,
		minItems: 2,

		prefixItems: [{ $ref: "prefixedBlockHash" }, { type: "boolean" }],
		type: "array",
	};

	public async handle(parameters: [string, boolean]): Promise<object | null> {
		const transactionObject = parameters[1];

		const block = await this.databaseService.getBlockById(parameters[0].slice(2));

		if (!block) {
			// eslint-disable-next-line unicorn/no-null
			return null;
		}

		return this.app.resolve(BlockResource).transform(block, transactionObject);
	}
}
