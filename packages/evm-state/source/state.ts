import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class State implements Contracts.Evm.State {
	public peerCount = 0;
}
