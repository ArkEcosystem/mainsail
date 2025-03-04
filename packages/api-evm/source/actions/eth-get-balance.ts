import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getHistoryHeightFromBlockTag } from "../utils/resolve-block-tag.js";

@injectable()
export class EthGetBalanceAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	public readonly name: string = "eth_getBalance";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 2,
		minItems: 2,

		prefixItems: [{ $ref: "address" }, { $ref: "blockTag" }],
		type: "array",
	};

	public async handle(parameters: [string, string]): Promise<string> {
		const [address, blockTag] = parameters;
		const height = await getHistoryHeightFromBlockTag(blockTag);

		const accountInfo = await this.evm.getAccountInfo(address, height);

		return `0x${accountInfo.balance.toString(16)}`;
	}
}
