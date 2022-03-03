import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Enums, Providers, Services } from "@arkecosystem/core-kernel";
import Joi from "joi";

import { ForgeNewBlockAction, IsForgingAllowedAction } from "./actions";
import { DELEGATE_FACTORY } from "./bindings";
import { ValidatorFactory } from "./validator-factory";
import { ValidatorTracker } from "./validator-tracker";
import { ForgerService } from "./forger-service";
import { Validator } from "./interfaces";
import { CurrentValidatorProcessAction, LastForgedBlockRemoteAction, NextSlotProcessAction } from "./process-actions";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.ForgerService).to(ForgerService).inSingletonScope();
		this.app.bind(DELEGATE_FACTORY).to(ValidatorFactory).inSingletonScope();

		this.registerActions();

		this.registerProcessActions();
	}

	public async boot(): Promise<void> {
		const validators: Validator[] = await this.makeValidators();

		const forgerService = this.app.get<ForgerService>(Identifiers.ForgerService);

		forgerService.register(this.config().all());
		await forgerService.boot(validators);

		this.startTracker(validators);

		// // Don't keep bip38 password in memory
		// this.config().set("app.flags.bip38", undefined);
		// this.config().set("app.flags.password", undefined);
	}

	public async dispose(): Promise<void> {
		await this.app.get<ForgerService>(Identifiers.ForgerService).dispose();
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
			hosts: Joi.array()
				.items(
					Joi.object({
						hostname: Joi.string()
							.ip({
								version: ["ipv4", "ipv6"],
							})
							.required(),
						port: Joi.number().integer().min(1).max(65_535).required(),
					}),
				)
				.required(),
			password: Joi.string(),
			tracker: Joi.bool().required(),
		}).unknown(true);
	}

	private registerActions(): void {
		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("forgeNewBlock", new ForgeNewBlockAction());

		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("isForgingAllowed", new IsForgingAllowedAction());
	}

	private registerProcessActions(): void {
		this.app
			.get<Contracts.Kernel.ProcessActionsService>(Identifiers.ProcessActionsService)
			.register(this.app.resolve(CurrentValidatorProcessAction));

		this.app
			.get<Contracts.Kernel.ProcessActionsService>(Identifiers.ProcessActionsService)
			.register(this.app.resolve(NextSlotProcessAction));

		this.app
			.get<Contracts.Kernel.ProcessActionsService>(Identifiers.ProcessActionsService)
			.register(this.app.resolve(LastForgedBlockRemoteAction));
	}

	private startTracker(validators: Validator[]): void {
		if (!Array.isArray(validators) || validators.length === 0) {
			return;
		}

		if (this.config().get("tracker") === true) {
			this.app
				.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService)
				.listen(
					Enums.BlockEvent.Applied,
					this.app.resolve<ValidatorTracker>(ValidatorTracker).initialize(validators),
				);
		}
	}

	private async makeValidators(): Promise<Validator[]> {
		const validators: Set<Validator> = new Set<Validator>();

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
