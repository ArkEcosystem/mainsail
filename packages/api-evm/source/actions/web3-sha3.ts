import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Hex, keccak256 } from "viem";

@injectable()
export class Web3Sha3 implements Contracts.Api.RPC.Action {
	public readonly name: string = "web3_sha3";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 1,
		minItems: 1,

		prefixItems: [{ $ref: "prefixedQuantityHex" }],
		type: "array",
	};

	public async handle(parameters: [string]): Promise<string> {
		return `0x${keccak256(parameters[0] as Hex).slice(2)}`;
	}
}
