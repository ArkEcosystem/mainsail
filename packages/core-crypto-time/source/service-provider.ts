import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { BlockTimeCalculator } from "./block-time-calculator";
import { Slots } from "./slots";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Time.BlockTimeCalculator).to(BlockTimeCalculator).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Time.Slots).to(Slots).inSingletonScope();
	}
}
