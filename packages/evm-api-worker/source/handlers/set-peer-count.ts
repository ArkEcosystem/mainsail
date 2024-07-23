import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class SetPeerCountHandler {
	@inject(Identifiers.Evm.State)
	private readonly state!: Contracts.Evm.State;

	public async handle(peerCount: number): Promise<void> {
		this.state.peerCount = peerCount;
	}
}
