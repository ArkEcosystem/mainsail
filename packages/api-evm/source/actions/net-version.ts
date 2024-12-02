import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class NetVersion implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public readonly name: string = "net_version";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 0,
		type: "array",
	};

	public async handle(parameters: []): Promise<string> {
		return this.configuration.get<string>("network.nethash");
	}
}
