import { Container, Contracts } from "@arkecosystem/core-kernel";
import { ensureFileSync, existsSync } from "fs-extra";
import lowdb from "lowdb";
import FileSync from "lowdb/adapters/FileSync";
import { v4 as uuidv4 } from "uuid";

import { Webhook } from "./interfaces";

@Container.injectable()
export class Database {
	@Container.inject(Container.Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	private database: lowdb.LowdbSync<any>;

	public boot() {
		const adapterFile: string = this.app.cachePath("webhooks.json");

		if (!existsSync(adapterFile)) {
			ensureFileSync(adapterFile);
		}

		this.database = lowdb(new FileSync(adapterFile));
		this.database.defaults({ webhooks: [] }).write();
	}

	public all(): Webhook[] {
		// @ts-ignore
		return this.database.get("webhooks", []).value();
	}

	public hasById(id: string): boolean {
		return !!this.findById(id);
	}

	public findById(id: string): Webhook | undefined {
		// @ts-ignore
		return this.database.get("webhooks").find({ id }).value();
	}

	public findByEvent(event: string): Webhook[] {
		// @ts-ignore
		return this.database.get("webhooks").filter({ event }).value();
	}

	public create(data: Webhook): Webhook | undefined {
		data.id = uuidv4();

		// @ts-ignore
		this.database.get("webhooks").push(data).write();

		return this.findById(data.id);
	}

	public update(id: string, data: Webhook): Webhook {
		// @ts-ignore
		return this.database.get("webhooks").find({ id }).assign(data).write();
	}

	public destroy(id: string): void {
		// @ts-ignore
		this.database.get("webhooks").remove({ id }).write();
	}
}
