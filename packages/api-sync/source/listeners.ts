import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { EventListener, Listeners as IListeners } from "./contracts.js";
import { ApiNodes } from "./listeners/api-nodes.js";
import { DeployerContracts } from "./listeners/contracts.js";
import { Peers } from "./listeners/peers.js";
import { Plugins } from "./listeners/plugins.js";

@injectable()
export class Listeners implements IListeners {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	#listeners: EventListener[] = [];

	public async register(): Promise<void> {
		// Listen to events before bootstrap, so we can catch all boot events.
		for (const constructor of [ApiNodes, DeployerContracts, Peers, Plugins]) {
			const listener = this.app.resolve(constructor as Contracts.Kernel.Container.Newable<EventListener>);
			await listener.register();
			this.#listeners.push(listener);
		}
	}

	public async bootstrap(): Promise<void> {
		for (const listener of this.#listeners) {
			await listener.boot();
		}
	}

	public async dispose(): Promise<void> {
		for (const listener of this.#listeners) {
			await listener.dispose();
		}

		this.#listeners = [];
	}
}
