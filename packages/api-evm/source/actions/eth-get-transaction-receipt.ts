import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class EthGetTransactionReceipt implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_getTransactionReceipt";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 1,
		minItems: 1,

		prefixItems: [
			{ $ref: "prefixedHex" }, // TODO: Extract transaction id
		],
		type: "array",
	};

	public async handle(parameters: [string, boolean]): Promise<object | null> {
		return null;
	}
}
