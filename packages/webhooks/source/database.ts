import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { existsSync } from "fs";
import { ensureFileSync } from "fs-extra/esm";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import { v4 as uuidv4 } from "uuid";

import { Webhook } from "./interfaces.js";

@injectable()
export class Database {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	#database!: LowSync<{ webhooks: Webhook[] }>;

	public boot() {
		const adapterFile: string = this.app.cachePath("webhooks.json");

		if (!existsSync(adapterFile)) {
			ensureFileSync(adapterFile);
		}

		this.#database = new LowSync<{ webhooks: Webhook[] }>(new JSONFileSync(adapterFile), { webhooks: [] });
		this.#tryRestore();
	}

	public all(): Webhook[] {
		return this.#database.data.webhooks;
	}

	public hasById(id: string): boolean {
		return !!this.findById(id);
	}

	public findById(id: string): Webhook | undefined {
		return this.#database.data.webhooks.find((webhook) => webhook.id === id);
	}

	public findByEvent(event: string): Webhook[] {
		return this.#database.data.webhooks.filter((webhook) => webhook.event === event);
	}

	public create(data: Webhook): Webhook | undefined {
		data.id = uuidv4();

		this.#database.data.webhooks.push(data);
		this.#database.write();

		return this.findById(data.id);
	}

	public update(id: string, data: Webhook): Webhook | undefined {
		const webhook = this.#database.data.webhooks.find((webhook) => webhook.id === id);
		if (webhook) {
			Object.assign(webhook, data);
			this.#database.write();
		}

		return webhook;
	}

	public destroy(id: string): void {
		this.#database.data.webhooks = this.#database.data.webhooks.filter((webhook) => webhook.id !== id);
		this.#database.write();
	}

	#tryRestore(): void {
		try {
			this.#database.read();
		} catch {}
	}
}
