import { Kernel } from "@arkecosystem/core-contracts";

import { BlockEvent, KernelEvent } from "../../enums";
import { Identifiers, inject, injectable } from "../../ioc";
import { ServiceProvider, ServiceProviderRepository } from "../../providers";

@injectable()
export class ChangeServiceProviderState implements Kernel.EventListener {
	@inject(Identifiers.ServiceProviderRepository)
	private readonly serviceProviders!: ServiceProviderRepository;

	private name!: string;

	private serviceProvider!: ServiceProvider;

	public initialize(name: string, serviceProvider: ServiceProvider): this {
		this.name = name;
		this.serviceProvider = serviceProvider;

		return this;
	}

	public async handle({ name, data }): Promise<void> {
		if (name === BlockEvent.Applied) {
			return this.changeState();
		}

		if (name === KernelEvent.ServiceProviderBooted && data.name !== this.name) {
			return this.changeState(data.name);
		}
	}

	private async changeState(previous?: string): Promise<void> {
		if (this.serviceProviders.failed(this.name)) {
			return;
		}

		if (this.serviceProviders.loaded(this.name) && (await this.serviceProvider.disposeWhen(previous))) {
			await this.serviceProviders.dispose(this.name);
		}

		if (this.serviceProviders.deferred(this.name) && (await this.serviceProvider.bootWhen(previous))) {
			await this.serviceProviders.boot(this.name);
		}
	}
}
