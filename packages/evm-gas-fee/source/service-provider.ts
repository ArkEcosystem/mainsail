import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { GasFeeCalculator } from "./gas-fee-calculator.js";
import { GasLimits } from "./gas-limits.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Evm.Gas.Limits).to(GasLimits).inSingletonScope();
		this.app.bind(Identifiers.Evm.Gas.FeeCalculator).to(GasFeeCalculator).inSingletonScope();
	}
}
