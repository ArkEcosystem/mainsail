import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { GasFeeCalculator } from "./gas-fee-calculator.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Evm.Gas.FeeCalculator).to(GasFeeCalculator).inSingletonScope();
	}
}
