import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers, Services } from "@arkecosystem/core-kernel";
import Joi from "joi";

import { ForgeNewBlockAction, IsForgingAllowedAction } from "./actions";
import { DELEGATE_FACTORY } from "./bindings";
import { ForgerService } from "./forger-service";
import { ValidatorFactory } from "./validator-factory";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Forger.Service).to(ForgerService).inSingletonScope();
		this.app.bind(DELEGATE_FACTORY).to(ValidatorFactory).inSingletonScope();

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

	public async bootWhen(): Promise<boolean> {
		const { secrets, bip38 }: { secrets: string[]; bip38: string } = this.app.config("validators")!;

		if (!bip38 && (!secrets || secrets.length === 0 || !Array.isArray(secrets))) {
			return false;
		}

		return true;
	}

	public configSchema(): object {
		return Joi.object({
			bip38: Joi.string(),
			password: Joi.string(),
		}).unknown(true);
	}

	private registerActions(): void {
		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("forgeNewBlock", this.app.resolve(ForgeNewBlockAction));

		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("isForgingAllowed", this.app.resolve(IsForgingAllowedAction));
	}

	private async makeValidators(): Promise<Contracts.Forger.Validator[]> {
		const validators: Set<Contracts.Forger.Validator> = new Set<Contracts.Forger.Validator>();

		for (const secret of this.app.config("validators.secrets")) {
			validators.add(await this.app.get<ValidatorFactory>(DELEGATE_FACTORY).fromBIP39(secret));
		}

		const { bip38, password } = this.app.config("app.flags")!;

		if (bip38) {
			validators.add(await this.app.get<ValidatorFactory>(DELEGATE_FACTORY).fromBIP38(bip38, password));
		}

		return [...validators];
	}
}
