import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class EthGasPriceAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public readonly name: string = "eth_gasPrice";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 0,
		type: "array",
	};

	public async handle(): Promise<string> {
		const milestone = this.configuration.getMilestone();

		return `0x${milestone.gas.minimumGasPrice.toString(16)}`;
	}
}
