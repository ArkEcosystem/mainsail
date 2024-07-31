import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

type BlockTag = "latest" | "earliest" | "pending";

@injectable()
export class EthGetStorageAtAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	public readonly name: string = "eth_getStorageAt";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 3,
		minItems: 3,

		prefixItems: [
			{ $ref: "address" },
			{ $ref: "prefixedHex" }, // TODO: Check length
			{ enum: ["latest", "finalized", "safe"], type: "string" },
		],
		type: "array",
	};

	public async handle(parameters: [string, string, BlockTag]): Promise<any> {
		const [address, slot] = parameters;

		try {
			return await this.evm.storageAt(address, BigInt(slot));
		} catch (error) {
			console.log(error);
		}
	}
}
