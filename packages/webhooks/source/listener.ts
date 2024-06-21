import { inject, injectable } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { get } from "@mainsail/utils";
import { performance } from "perf_hooks";

import { conditions } from "./conditions.js";
import { Database } from "./database.js";

@injectable()
export class Listener {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public async handle({ name, data }): Promise<void> {
		// Skip own events to prevent cycling
		if (name.includes("webhooks")) {
			return;
		}

		const webhooks: Contracts.Webhooks.Webhook[] = this.#getWebhooks(name, data);

		const promises: Promise<void>[] = [];

		for (const webhook of webhooks) {
			promises.push(this.broadcast(webhook, data));
		}

		await Promise.all(promises);
	}

	public async broadcast(webhook: Contracts.Webhooks.Webhook, payload: object, timeout = 1500): Promise<void> {
		const start = performance.now();

		try {
			const { statusCode } = await Utils.http.post(webhook.target, {
				body: {
					data: payload as any,
					// @TODO utils currently expects a primitive as data
					event: webhook.event,
					timestamp: Date.now(),
				},
				headers: {
					Authorization: webhook.token,
				},
				timeout,
			});

			this.logger.debug(
				`Webhooks Job ${webhook.id} completed! Event [${webhook.event}] has been transmitted to [${webhook.target}] with a status of [${statusCode}].`,
			);

			await this.#dispatchWebhookEvent(start, webhook, payload);
		} catch (error) {
			this.logger.error(`Webhooks Job ${webhook.id} failed: ${error.code ?? error.message}`);

			await this.#dispatchWebhookEvent(start, webhook, payload, error);
		}
	}

	async #dispatchWebhookEvent(start: number, webhook: Contracts.Webhooks.Webhook, payload: object, error?: Error) {
		if (error) {
			void this.events.dispatch(Events.WebhookEvent.Failed, {
				error: error,
				executionTime: performance.now() - start,
				payload: payload,
				webhook: webhook,
			});
		} else {
			void this.events.dispatch(Events.WebhookEvent.Broadcasted, {
				executionTime: performance.now() - start,
				payload: payload,
				webhook: webhook,
			});
		}
	}

	#getWebhooks(event: string, payload: object): Contracts.Webhooks.Webhook[] {
		return this.app
			.get<Database>(Identifiers.Webhooks.Database)
			.findByEvent(event)
			.filter((webhook: Contracts.Webhooks.Webhook) => {
				if (!webhook.enabled) {
					return false;
				}

				if (!webhook.conditions || (Array.isArray(webhook.conditions) && webhook.conditions.length === 0)) {
					return true;
				}

				for (const condition of webhook.conditions) {
					try {
						const satisfies = conditions[condition.condition];

						if (satisfies(get(payload, condition.key), condition.value)) {
							return true;
						}
					} catch {
						return false;
					}
				}

				return false;
			});
	}
}
