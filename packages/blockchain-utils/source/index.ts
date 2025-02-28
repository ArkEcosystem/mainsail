import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { FeeCalculator } from "./fee-calculator.js";
import { ProposerCalculator } from "./proposer-calculator.js";
import { RoundCalculator } from "./round-calculator.js";
import { SupplyCalculator } from "./supply-calculator.js";
import { TimestampCalculator } from "./timestamp-calculator.js";

export { formatCurrency } from "./format-currency.js";
export { getBlockNotChainedErrorMessage, isBlockChained } from "./is-block-chained.js";
export { isMajority } from "./is-majority.js";
export { isMinority } from "./is-minority.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.BlockchainUtils.ProposerCalculator).to(ProposerCalculator).inSingletonScope();
		this.app.bind(Identifiers.BlockchainUtils.FeeCalculator).to(FeeCalculator).inSingletonScope();
		this.app.bind(Identifiers.BlockchainUtils.RoundCalculator).to(RoundCalculator).inSingletonScope();
		this.app.bind(Identifiers.BlockchainUtils.SupplyCalculator).to(SupplyCalculator).inSingletonScope();
		this.app.bind(Identifiers.BlockchainUtils.TimestampCalculator).to(TimestampCalculator).inSingletonScope();
	}
}
