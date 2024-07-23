import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { numberToHex } from "@mainsail/utils";

@injectable()
export class NetPeerCountAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Evm.State)
	private readonly state!: Contracts.Evm.State;

	public readonly name: string = "net_peerCount";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 0,
		type: "array",
	};

	public async handle(parameters: []): Promise<string> {
		return `0x${numberToHex(this.state.peerCount, 1)}`;
	}
}
