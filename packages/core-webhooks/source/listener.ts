import { Utils } from "@arkecosystem/core-kernel";
import { performance } from "perf_hooks";
import { injectable, inject } from "@arkecosystem/core-container";

import { conditions } from "./conditions";
import { Database } from "./database";
import { WebhookEvent } from "./events";
import { InternalIdentifiers } from "./identifiers";
import { Webhook } from "./interfaces";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

@injectable()
export class Listener {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async handle({ name, data }): Promise<void> {
		// Skip own events to prevent cycling
		if (name.toString().includes("webhooks")) {
			return;
		}

		const webhooks: Webhook[] = this.getWebhooks(name, data);

		const promises: Promise<void>[] = [];

		for (const webhook of webhooks) {
			promises.push(this.broadcast(webhook, data));
		}

		await Promise.all(promises);
	}

	public async broadcast(webhook: Webhook, payload: object, timeout: number = 1500): Promise<void> {
		const start = performance.now();

		try {
			const { statusCode } = await Utils.http.post(webhook.target, {
				body: {
					timestamp: +new Date(),
					data: payload as any, // todo: utils currently expects a primitive as data
					event: webhook.event,
				},
				headers: {
					Authorization: webhook.token,
				},
				timeout,
			});

			this.logger.debug(
				`Webhooks Job ${webhook.id} completed! Event [${webhook.event}] has been transmitted to [${webhook.target}] with a status of [${statusCode}].`,
			);

			await this.dispatchWebhookEvent(start, webhook, payload);
		} catch (error) {
			this.logger.error(`Webhooks Job ${webhook.id} failed: ${error.message}`);

			await this.dispatchWebhookEvent(start, webhook, payload, error);
		}
	}

	private async dispatchWebhookEvent(start: number, webhook: Webhook, payload: object, err?: Error) {
		if (err) {
			this.events.dispatch(WebhookEvent.Failed, {
				executionTime: performance.now() - start,
				webhook: webhook,
				payload: payload,
				error: err,
			});
		} else {
			this.events.dispatch(WebhookEvent.Broadcasted, {
				executionTime: performance.now() - start,
				webhook: webhook,
				payload: payload,
			});
		}
	}

	private getWebhooks(event: string, payload: object): Webhook[] {
		return this.app
			.get<Database>(InternalIdentifiers.Database)
			.findByEvent(event)
			.filter((webhook: Webhook) => {
				if (!webhook.enabled) {
					return false;
				}

				if (!webhook.conditions || (Array.isArray(webhook.conditions) && !webhook.conditions.length)) {
					return true;
				}

				for (const condition of webhook.conditions) {
					try {
						const satisfies = conditions[condition.condition];

						if (satisfies(payload[condition.key], condition.value)) {
							return true;
						}
					} catch (error) {
						return false;
					}
				}

				return false;
			});
	}
}
