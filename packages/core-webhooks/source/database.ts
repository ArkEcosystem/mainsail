import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { ensureFileSync, existsSync } from "fs-extra";
import lowdb from "lowdb";
import FileSync from "lowdb/adapters/FileSync";
import { v4 as uuidv4 } from "uuid";

import { Webhook } from "./interfaces";

@injectable()
export class Database {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	#database: lowdb.LowdbSync<any>;

	public boot() {
		const adapterFile: string = this.app.cachePath("webhooks.json");

		if (!existsSync(adapterFile)) {
			ensureFileSync(adapterFile);
		}

		this.#database = lowdb(new FileSync(adapterFile));
		this.#database.defaults({ webhooks: [] }).write();
	}

	public all(): Webhook[] {
		return this.#database.get("webhooks", []).value();
	}

	public hasById(id: string): boolean {
		return !!this.findById(id);
	}

	public findById(id: string): Webhook | undefined {
		return this.#database.get("webhooks").find({ id }).value();
	}

	public findByEvent(event: string): Webhook[] {
		return this.#database.get("webhooks").filter({ event }).value();
	}

	public create(data: Webhook): Webhook | undefined {
		data.id = uuidv4();

		this.#database.get("webhooks").push(data).write();

		return this.findById(data.id);
	}

	public update(id: string, data: Webhook): Webhook {
		return this.#database.get("webhooks").find({ id }).assign(data).write();
	}

	public destroy(id: string): void {
		this.#database.get("webhooks").remove({ id }).write();
	}
}
