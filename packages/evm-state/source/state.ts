import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";

@injectable()
export class State implements Contracts.Evm.State {
	public peersCount = 0;
}
