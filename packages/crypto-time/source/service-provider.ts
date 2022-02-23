import { Providers } from "@arkecosystem/core-kernel";
import { BINDINGS } from "@packages/crypto-contracts/distribution";
import { BlockTimeCalculator } from "./block-time-calculator";
import { Slots } from "./slots";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(BINDINGS.Time.BlockTimeCalculator).to(BlockTimeCalculator).inSingletonScope();
		this.app.bind(BINDINGS.Time.Slots).to(Slots).inSingletonScope();
	}
}
