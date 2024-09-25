import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

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

		prefixItems: [{ $ref: "address" }, { enum: ["latest", "finalized", "safe"], type: "string" }],
		type: "array",
	};

	public async handle(parameters: [string, string]): Promise<string> {
		const [address] = parameters;
		const accountInfo =  await this.evm.getAccountInfo(address);

		return `0x${Number(accountInfo.balance.toString(16))}`;

	}
}
