import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Providers } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { FeeMatcher } from "./matcher.js";
import { ProcessorExtension } from "./processor-extension.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Fee.Type).toConstantValue("static");
		this.app.bind(Identifiers.Fee.Matcher).to(FeeMatcher).inSingletonScope();
		this.app.bind(Identifiers.TransactionPool.ProcessorExtension).to(ProcessorExtension);
	}

	public async boot(): Promise<void> {
		this.app
			.get<Contracts.Kernel.EventDispatcher>(Identifiers.Services.EventDispatcher.Service)
			.listen(Enums.CryptoEvent.MilestoneChanged, this);

		await this.#updateStaticFees();
	}

	public async dispose(): Promise<void> {
		this.app
			.get<Contracts.Kernel.EventDispatcher>(Identifiers.Services.EventDispatcher.Service)
			.forget(Enums.CryptoEvent.MilestoneChanged, this);
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public requiredByWorker(): boolean {
		return true;
	}

	public async handle({ name }): Promise<void> {
		// eslint-disable-next-line sonarjs/no-small-switch
		switch (name) {
			case Enums.CryptoEvent.MilestoneChanged: {
				await this.#updateStaticFees();
				break;
			}
		}
	}

	async #updateStaticFees(): Promise<void> {
		const configuration = this.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
		const logger = this.app.get<Contracts.Kernel.Logger>(Identifiers.Services.Log.Service);
		const registry = this.app.get<Contracts.Fee.FeeRegistry>(Identifiers.Fee.Registry);

		const { fees } = configuration.getMilestone();
		const { staticFees = {} } = fees ?? {};

		for (const [key, fee] of Object.entries(staticFees)) {
			const newFee = BigNumber.make(fee);

			if (configuration.getHeight() > 0) {
				const previousFee = registry.get(key);
				if (newFee.isEqualTo(previousFee)) {
					continue;
				}

				logger.info(`updating static fee of ${key} ${previousFee} => ${newFee}`);
			} else {
				logger.debug(`initializing static fee of ${key} ${newFee}`);
			}

			registry.set(key, newFee);
		}
	}
}
