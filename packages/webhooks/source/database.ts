import { inject, injectable } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { existsSync } from "fs";
import { ensureFileSync } from "fs-extra/esm";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class Database {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	#database!: LowSync<{ webhooks: Contracts.Webhooks.Webhook[] }>;

	public boot() {
		const adapterFile: string = this.app.cachePath("webhooks.json");

		if (!existsSync(adapterFile)) {
			ensureFileSync(adapterFile);
		}

		this.#database = new LowSync<{ webhooks: Contracts.Webhooks.Webhook[] }>(new JSONFileSync(adapterFile), {
			webhooks: [],
		});
		this.#restore();
	}

	public all(): Contracts.Webhooks.Webhook[] {
		return this.#database.data.webhooks;
	}

	public hasById(id: string): boolean {
		return !!this.findById(id);
	}

	public findById(id: string): Contracts.Webhooks.Webhook | undefined {
		return this.#database.data.webhooks.find((webhook) => webhook.id === id);
	}

	public findByEvent(event: string): Contracts.Webhooks.Webhook[] {
		return this.#database.data.webhooks.filter((webhook) => webhook.event === event);
	}

	public create(data: Contracts.Webhooks.Webhook): Contracts.Webhooks.Webhook | undefined {
		data.id = uuidv4();

		this.#database.data.webhooks.push(data);
		this.#database.write();

		void this.eventDispatcher.dispatch(Events.WebhookEvent.Created, { webhook: data });

		return this.findById(data.id);
	}

	public update(id: string, data: Contracts.Webhooks.Webhook): Contracts.Webhooks.Webhook | undefined {
		const webhook = this.#database.data.webhooks.find((webhook) => webhook.id === id);
		if (webhook) {
			Object.assign(webhook, data);
			this.#database.write();

			void this.eventDispatcher.dispatch(Events.WebhookEvent.Updated, { webhook: data });
		}

		return webhook;
	}

	public destroy(id: string): void {
		const webhook = this.#database.data.webhooks.find((webhook) => webhook.id === id);

		if (webhook) {
			this.#database.data.webhooks = this.#database.data.webhooks.filter((webhook) => webhook.id !== id);
			this.#database.write();

			void this.eventDispatcher.dispatch(Events.WebhookEvent.Removed, { webhook });
		}
	}

	#restore(): void {
		try {
			this.#database.read();
		} catch {}
	}
}
