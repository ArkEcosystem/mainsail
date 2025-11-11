import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

@injectable()
export class EthChainIdAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public readonly name: string = "eth_chainId";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 0,
		type: "array",
	};

	public async handle(parameters: []): Promise<string> {
		return `0x${this.configuration.get<number>("network.chainId").toString(16)}`;
	}
}
