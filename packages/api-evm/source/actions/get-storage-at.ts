import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

type BlockTag = "latest" | "earliest" | "pending";

@injectable()
export class GetStorageAtAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	public readonly name: string = "eth_getStorageAt";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 0,
		type: "array",
	};

	public async handle(parameters: [string, string, BlockTag]): Promise<any> {
		const [address, slotKey] = parameters;

		// TODO: ensure 0x prefix, 32 byte length, etc.

		const value = await this.evm.storageAt(
			address,
			slotKey,
			// ignore tag, we always return LATEST
		);

		return value;
	}
}
