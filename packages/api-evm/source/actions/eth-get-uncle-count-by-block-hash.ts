import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class EthGetUncleCountByBlockHash implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_getUncleCountByBlockHash";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 1,
		minItems: 1,

		prefixItems: [{ $ref: "prefixedHex" }], // TODO: Replace prefixedHex with prefixedBlockId
		type: "array",
	};

	public async handle(parameters: []): Promise<string> {
		return `0x0`;
	}
}
