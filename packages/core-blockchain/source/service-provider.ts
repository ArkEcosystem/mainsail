import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers, Services } from "@arkecosystem/core-kernel";
import Joi from "joi";

import { ProcessBlockAction } from "./actions";
import { Blockchain } from "./blockchain";
import { BlockProcessor } from "./processor";
import { StateMachine } from "./state-machine";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.StateMachine).to(StateMachine).inSingletonScope();
		this.app.bind(Identifiers.BlockchainService).to(Blockchain).inSingletonScope();
		this.app.bind(Identifiers.BlockProcessor).to(BlockProcessor).inSingletonScope();

		this.#registerActions();
	}

	public async boot(): Promise<void> {
		await this.app.get<Contracts.Blockchain.Blockchain>(Identifiers.BlockchainService).boot();
	}

	public async dispose(): Promise<void> {
		await this.app.get<Contracts.Blockchain.Blockchain>(Identifiers.BlockchainService).dispose();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public configSchema(): object {
		return Joi.object({
			databaseRollback: Joi.object({
				maxBlockRewind: Joi.number().integer().min(1).required(),
				steps: Joi.number().integer().min(1).required(),
			}).required(),

			// used in core:run & relay:run
			networkStart: Joi.bool(),
		}).unknown(true);
	}

	#registerActions(): void {
		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("processBlock", new ProcessBlockAction());
	}
}
