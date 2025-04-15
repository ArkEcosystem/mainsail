import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class EthGetStorageAtAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "rpc")
	private readonly evm!: Contracts.Evm.Instance;

	public readonly name: string = "eth_getStorageAt";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 3,
		minItems: 3,

		prefixItems: [
			{ $ref: "address" },
			{ allOf: [{ $ref: "prefixedQuantityHex" }, { maxLength: 66, type: "string" }] },
			{ $ref: "blockTag" },
		],
		type: "array",
	};

	public async handle(parameters: [string, string, Contracts.Crypto.BlockTag]): Promise<any> {
		const [address, slot] = parameters;

		return await this.evm.storageAt(address, BigInt(slot));
	}
}
