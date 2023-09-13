import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { Sync } from "./sync";
import * as Listeners from "./listeners/peers";
import * as ApiSyncContracts from "./contracts";

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
		for (const constructor of [Listeners.Peers]) {
			const listener = this.app.resolve(constructor);
			await listener.boot();
			this.#listeners.push(listener);
		};
	}

	async #disposeListeners(): Promise<void> {
		for (const listener of this.#listeners) {
			await listener.dispose();
		}

		this.#listeners = [];
	}

}
