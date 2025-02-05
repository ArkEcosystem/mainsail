import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class EthGasPriceAction implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_gasPrice";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 0,
		type: "array",
	};

	public async handle(): Promise<string> {
		return `0x5`;
	}
}
