import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class SetPeerCountHandler {
	@inject(Identifiers.Evm.State)
	private readonly state!: Contracts.Evm.State;

	public async handle(peerCount: number): Promise<void> {
		this.state.peersCount = peerCount;
	}
}
