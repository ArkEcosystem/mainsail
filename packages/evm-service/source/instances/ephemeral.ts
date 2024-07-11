import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { EvmInstance } from "./evm.js";

@injectable()
export class EphemeralInstance extends EvmInstance {
	public mode(): Contracts.Evm.EvmMode {
		return Contracts.Evm.EvmMode.Ephemeral;
	}
}
