import { Identifiers } from "@arkecosystem/core-contracts";
import { Providers, Services } from "@arkecosystem/core-kernel";
import Joi from "joi";

import {
	ApplyTransactionAction,
	RevertTransactionAction,
	ThrowIfCannotEnterPoolAction,
	VerifyTransactionAction,
} from "./actions";
import { Collator } from "./collator";
import { ExpirationService } from "./expiration-service";
import { Mempool } from "./mempool";
import { Processor } from "./processor";
import { Query } from "./query";
import { SenderMempool } from "./sender-mempool";
import { SenderState } from "./sender-state";
import { Service } from "./service";
import { Storage } from "./storage";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.registerServices();
		this.registerActions();
	}

	public async boot(): Promise<void> {
		this.app.get<Storage>(Identifiers.TransactionPoolStorage).boot();
		await this.app.get<Service>(Identifiers.TransactionPoolService).boot();
	}

	public async dispose(): Promise<void> {
		this.app.get<Service>(Identifiers.TransactionPoolService).dispose();
		this.app.get<Storage>(Identifiers.TransactionPoolStorage).dispose();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public configSchema(): object {
		return Joi.object({
			allowedSenders: Joi.array().items(Joi.string()).required(),
			enabled: Joi.bool().required(),
			maxTransactionAge: Joi.number().integer().min(1).required(),
			maxTransactionBytes: Joi.number().integer().min(1).required(),
			maxTransactionsInPool: Joi.number().integer().min(1).required(),
			maxTransactionsPerRequest: Joi.number().integer().min(1).required(),
			maxTransactionsPerSender: Joi.number().integer().min(1).required(),
			storage: Joi.string().required(),
		}).unknown(true);
	}

	private registerServices(): void {
		this.app.bind(Identifiers.TransactionPoolCollator).to(Collator);
		this.app.bind(Identifiers.TransactionPoolExpirationService).to(ExpirationService);
		this.app.bind(Identifiers.TransactionPoolMempool).to(Mempool).inSingletonScope();
		this.app.bind(Identifiers.TransactionPoolProcessor).to(Processor);
		this.app.bind(Identifiers.TransactionPoolProcessorFactory).toAutoFactory(Identifiers.TransactionPoolProcessor);
		this.app.bind(Identifiers.TransactionPoolQuery).to(Query);
		this.app.bind(Identifiers.TransactionPoolSenderMempool).to(SenderMempool);
		this.app
			.bind(Identifiers.TransactionPoolSenderMempoolFactory)
			.toAutoFactory(Identifiers.TransactionPoolSenderMempool);
		this.app.bind(Identifiers.TransactionPoolSenderState).to(SenderState);
		this.app.bind(Identifiers.TransactionPoolService).to(Service).inSingletonScope();
		this.app.bind(Identifiers.TransactionPoolStorage).to(Storage).inSingletonScope();
	}

	private registerActions(): void {
		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("applyTransaction", new ApplyTransactionAction());

		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("revertTransaction", new RevertTransactionAction());

		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("throwIfCannotEnterPool", new ThrowIfCannotEnterPoolAction());

		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("verifyTransaction", new VerifyTransactionAction());
	}
}
