import { interfaces } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import * as ApiSyncContracts from "./contracts";
import { Mempool } from "./listeners/mempool";
import { Peers } from "./listeners/peers";
import { Sync } from "./sync";

export class ServiceProvider extends Providers.ServiceProvider {
	#listeners: ApiSyncContracts.EventListener[] = [];

	public async register(): Promise<void> {
		this.app.bind(Identifiers.ApiSync).to(Sync).inSingletonScope();
	}

	public async boot(): Promise<void> {
		await this.#bootListeners();
	}

	public async dispose(): Promise<void> {
		await this.#disposeListeners();
	}

	async #bootListeners(): Promise<void> {
		for (const constructor of [Peers, Mempool]) {
			const listener = this.app.resolve(constructor as interfaces.Newable<ApiSyncContracts.EventListener>);
			await listener.boot();
			this.#listeners.push(listener);
		}
	}

	async #disposeListeners(): Promise<void> {
		for (const listener of this.#listeners) {
			await listener.dispose();
		}

		this.#listeners = [];
	}
}
