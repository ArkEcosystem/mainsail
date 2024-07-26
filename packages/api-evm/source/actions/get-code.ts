import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
//import { ethers } from "ethers";

type BlockTag = "latest" | "earliest" | "pending";

@injectable()
export class GetCodeAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	public readonly name: string = "eth_getCode";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 0,
		type: "array",
	};

	public async handle(parameters: [string, BlockTag]): Promise<any> {
		const [address] = parameters;

		// TODO: ensure 0x prefix, 32 byte length, etc.

		return await this.evm.codeAt(
			address,
			// ignore tag, we always return LATEST
		);
	}
}
