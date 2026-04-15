import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";

@injectable()
export class State implements Contracts.Evm.State {
	public peerCount = 0;
}
