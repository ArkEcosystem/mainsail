import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { BlockResource } from "../resources/index.js";

@injectable()
export class EthGetBlockByNumberAction implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_getBlockByNumber";

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 2,
		minItems: 2,

		// prefixItems: [{ enum: ["latest", "finalized", "safe"], type: "string" }, { type: "boolean" }],
		prefixItems: [{ $ref: "prefixedHex" }, { type: "boolean" }],
		type: "array",
	};

	public async handle(parameters: [string, boolean]): Promise<object | null> {
		const height = Number.parseInt(parameters[0]);

		const commit = await this.databaseService.getCommit(height);

		if (!commit) {
			// eslint-disable-next-line unicorn/no-null
			return null;
		}

		return new BlockResource().transform(commit.block);
	}
}
