import { inject, injectable } from "@arkecosystem/core-container";
import { Identifiers, Kernel } from "@arkecosystem/core-contracts";

import { BlockEvent, KernelEvent } from "../../enums";
import { ServiceProviderCannotBeBooted } from "../../exceptions/plugins";
import { ServiceProviderRepository } from "../../providers";
import { assert } from "../../utils";
import { Bootstrapper } from "../interfaces";
import { ChangeServiceProviderState } from "./listeners";

// todo: review the implementation

@injectable()
export class BootServiceProviders implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Kernel.Application;

	@inject(Identifiers.ServiceProviderRepository)
	private readonly serviceProviders!: ServiceProviderRepository;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Kernel.Logger;

	public async bootstrap(): Promise<void> {
		for (const [name, serviceProvider] of this.serviceProviders.all()) {
			const serviceProviderName: string | undefined = serviceProvider.name();

			assert.defined<string>(serviceProviderName);

			if (await serviceProvider.bootWhen()) {
				try {
					await this.serviceProviders.boot(name);
				} catch (error) {
					this.logger.error(error.stack);
					const isRequired: boolean = await serviceProvider.required();

					if (isRequired) {
						throw new ServiceProviderCannotBeBooted(serviceProviderName, error.message);
					}

					this.serviceProviders.fail(serviceProviderName);
				}
			} else {
				this.serviceProviders.defer(name);
			}

			const eventListener: Kernel.EventListener = this.app
				.resolve(ChangeServiceProviderState)
				.initialize(serviceProviderName, serviceProvider);

			// Register the "enable/disposeWhen" listeners to be triggered on every block. Use with care!
			this.events.listen(BlockEvent.Applied, eventListener);

			// We only want to trigger this if another service provider has been booted to avoid an infinite loop.
			this.events.listen(KernelEvent.ServiceProviderBooted, eventListener);
		}
	}
}
