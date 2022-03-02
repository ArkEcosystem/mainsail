import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Enums, Providers, Services } from "@arkecosystem/core-kernel";
import Joi from "joi";

import { ForgeNewBlockAction, IsForgingAllowedAction } from "./actions";
import { DELEGATE_FACTORY } from "./bindings";
import { DelegateFactory } from "./delegate-factory";
import { DelegateTracker } from "./delegate-tracker";
import { ForgerService } from "./forger-service";
import { Delegate } from "./interfaces";
import { CurrentDelegateProcessAction, LastForgedBlockRemoteAction, NextSlotProcessAction } from "./process-actions";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.ForgerService).to(ForgerService).inSingletonScope();
		this.app.bind(DELEGATE_FACTORY).to(DelegateFactory).inSingletonScope();

		this.registerActions();

		this.registerProcessActions();
	}

	public async boot(): Promise<void> {
		const delegates: Delegate[] = await this.makeDelegates();

		const forgerService = this.app.get<ForgerService>(Identifiers.ForgerService);

		forgerService.register(this.config().all());
		await forgerService.boot(delegates);

		this.startTracker(delegates);

		// // Don't keep bip38 password in memory
		// this.config().set("app.flags.bip38", undefined);
		// this.config().set("app.flags.password", undefined);
	}

	public async dispose(): Promise<void> {
		await this.app.get<ForgerService>(Identifiers.ForgerService).dispose();
	}

	public async bootWhen(): Promise<boolean> {
		const { secrets, bip38 }: { secrets: string[]; bip38: string } = this.app.config("delegates")!;

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
			.register(this.app.resolve(CurrentDelegateProcessAction));

		this.app
			.get<Contracts.Kernel.ProcessActionsService>(Identifiers.ProcessActionsService)
			.register(this.app.resolve(NextSlotProcessAction));

		this.app
			.get<Contracts.Kernel.ProcessActionsService>(Identifiers.ProcessActionsService)
			.register(this.app.resolve(LastForgedBlockRemoteAction));
	}

	private startTracker(delegates: Delegate[]): void {
		if (!Array.isArray(delegates) || delegates.length === 0) {
			return;
		}

		if (this.config().get("tracker") === true) {
			this.app
				.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService)
				.listen(
					Enums.BlockEvent.Applied,
					this.app.resolve<DelegateTracker>(DelegateTracker).initialize(delegates),
				);
		}
	}

	private async makeDelegates(): Promise<Delegate[]> {
		const delegates: Set<Delegate> = new Set<Delegate>();

		for (const secret of this.app.config("delegates.secrets")) {
			delegates.add(await this.app.get<DelegateFactory>(DELEGATE_FACTORY).fromBIP39(secret));
		}

		const { bip38, password } = this.app.config("app.flags")!;

		if (bip38) {
			delegates.add(await this.app.get<DelegateFactory>(DELEGATE_FACTORY).fromBIP38(bip38, password));
		}

		return [...delegates];
	}
}
