import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { BlockResource } from "../resources/index.js";

@injectable()
export class EthGetBlockByNumberAction implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_getBlockByNumber";

	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 2,
		minItems: 2,

		prefixItems: [
			{ oneOf: [{ $ref: "prefixedHex" }, { enum: ["latest", "finalized", "safe"], type: "string" }] }, // TODO: Extract block tag
			{ type: "boolean" },
		],
		type: "array",
	};

	public async handle(parameters: [string, boolean]): Promise<object | null> {
		const height = parameters[0].startsWith("0x") ? Number.parseInt(parameters[0]) : this.stateStore.getHeight();
		const transactionObject = parameters[1];

		const block = await this.databaseService.getBlock(height);

		if (!block) {
			// eslint-disable-next-line unicorn/no-null
			return null;
		}

		return this.app.resolve(BlockResource).transform(block, transactionObject);
	}
}
