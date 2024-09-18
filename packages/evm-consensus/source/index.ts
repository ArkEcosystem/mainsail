import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Deployer } from "./deployer.js";
import { Selector } from "./selector.js";
import { ValidatorSet } from "./validator-set.js";

export * as ContractAbis from "./contracts.ts/index.js";
export { Identifiers } from "./identifiers.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		// REPLACES: validator-set-vote-weighted package
		this.app
			.get<Contracts.State.AttributeRepository>(Identifiers.State.AttributeRepository)
			.set("activeValidators", Contracts.State.AttributeType.String);
		this.app.bind(Identifiers.ValidatorSet.Service).to(ValidatorSet).inSingletonScope();

		// REPLACES: proposer package
		// TODO: Replace string with better structure
		this.app
			.get<Contracts.State.AttributeRepository>(Identifiers.State.AttributeRepository)
			.set("validatorMatrix", Contracts.State.AttributeType.String);
		this.app.bind(Identifiers.Proposer.Selector).to(Selector).inSingletonScope();
	}

	public async boot(): Promise<void> {
		this.app.get<Contracts.Kernel.Logger>(Identifiers.Services.Log.Service).info("Booting EVM Consensus...");

		await this.app.resolve(Deployer).deploy();
	}
}
