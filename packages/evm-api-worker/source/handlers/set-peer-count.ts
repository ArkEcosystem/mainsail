import { inject, injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";

@injectable()
export class SetPeerCountHandler {
	@inject(Identifiers.Evm.State)
	private readonly state!: Contracts.Evm.State;

	public async handle(peerCount: number): Promise<void> {
		this.state.peerCount = peerCount;
	}
}
