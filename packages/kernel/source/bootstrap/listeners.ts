import { inject, injectable } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";

import { ServiceProvider, ServiceProviderRepository } from "../providers/index.js";

@injectable()
export class ChangeServiceProviderState implements Contracts.Kernel.EventListener {
	@inject(Identifiers.ServiceProvider.Repository)
	private readonly serviceProviders!: ServiceProviderRepository;

	#name!: string;

	#serviceProvider!: ServiceProvider;

	public initialize(name: string, serviceProvider: ServiceProvider): this {
		this.#name = name;
		this.#serviceProvider = serviceProvider;

		return this;
	}

	public async handle({ name, data }): Promise<void> {
		if (name === Events.BlockEvent.Applied) {
			return this.#changeState();
		}

		if (name === Events.KernelEvent.ServiceProviderBooted && data.name !== this.#name) {
			return this.#changeState(data.name);
		}
	}

	async #changeState(previous?: string): Promise<void> {
		if (this.serviceProviders.failed(this.#name)) {
			return;
		}

		if (this.serviceProviders.loaded(this.#name) && (await this.#serviceProvider.disposeWhen(previous))) {
			await this.serviceProviders.dispose(this.#name);
		}

		if (this.serviceProviders.deferred(this.#name) && (await this.#serviceProvider.bootWhen(previous))) {
			await this.serviceProviders.boot(this.#name);
		}
	}
}
