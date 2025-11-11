import { injectable } from "@mainsail/container";
import { Identifiers } from "@mainsail/constants";
import { Providers } from "@mainsail/kernel";

import { FeeCalculator } from "./fee-calculator.js";
import { ProposerCalculator } from "./proposer-calculator.js";
import { RoundCalculator } from "./round-calculator.js";
import { TimestampCalculator } from "./timestamp-calculator.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.BlockchainUtils.ProposerCalculator).to(ProposerCalculator).inSingletonScope();
		this.app.bind(Identifiers.BlockchainUtils.FeeCalculator).to(FeeCalculator).inSingletonScope();
		this.app.bind(Identifiers.BlockchainUtils.RoundCalculator).to(RoundCalculator).inSingletonScope();
		this.app.bind(Identifiers.BlockchainUtils.TimestampCalculator).to(TimestampCalculator).inSingletonScope();
	}
}
