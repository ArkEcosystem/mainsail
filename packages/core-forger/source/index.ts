import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers, Services } from "@arkecosystem/core-kernel";

import { ForgeNewBlockAction, IsForgingAllowedAction } from "./actions";
import { GetCurrentRoundAction } from "./actions/get-current-round";
import { ForgerService } from "./forger-service";
import { Validator } from "./validator";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Forger.Service).to(ForgerService).inSingletonScope();

		this.registerActions();
	}

	public async boot(): Promise<void> {
		const validators: Contracts.Forger.Validator[] = await this.makeValidators();

		this.app.bind(Identifiers.Forger.Validators).toConstantValue(validators);

		await this.app.get<ForgerService>(Identifiers.Forger.Service).boot(validators);
	}

	public async dispose(): Promise<void> {
		await this.app.get<ForgerService>(Identifiers.Forger.Service).dispose();
	}

	private registerActions(): void {
		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("forgeNewBlock", this.app.resolve(ForgeNewBlockAction));

		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("isForgingAllowed", this.app.resolve(IsForgingAllowedAction));

		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("getCurrentRound", this.app.resolve(GetCurrentRoundAction));
	}

	private async makeValidators(): Promise<Contracts.Forger.Validator[]> {
		const validators: Set<Contracts.Forger.Validator> = new Set<Contracts.Forger.Validator>();

		for (const secret of this.app.config("validators.secrets")) {
			validators.add(await this.app.resolve(Validator).configure(secret));
		}

		return [...validators];
	}
}
