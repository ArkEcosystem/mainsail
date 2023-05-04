import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/core-kernel";

import { BlockTimeCalculator } from "./block-time-calculator";
import { BlockTimeLookup } from "./block-time-lookup";
import { Slots } from "./slots";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Time.BlockTimeLookup).to(BlockTimeLookup).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Time.BlockTimeCalculator).to(BlockTimeCalculator).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Time.Slots).to(Slots).inSingletonScope();
	}
}
