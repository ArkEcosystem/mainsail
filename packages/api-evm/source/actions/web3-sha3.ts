import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class Web3Sha3 implements Contracts.Api.RPC.Action {
	public readonly name: string = "web3_sha3";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 1,
		minItems: 1,

		prefixItems: [{ $ref: "prefixedHex" }],
		type: "array",
	};

	public async handle(parameters: [string]): Promise<string> {
		return `0x${0}`;
	}
}
