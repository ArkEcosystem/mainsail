import { Contracts } from "@arkecosystem/core-contracts";

import { Cache, Filesystem, Log, Pipeline, ProcessActions, Queue, Schedule, Triggers, Validation } from "../services";
import { Bootstrapper } from "./interfaces";

@injectable()
export class RegisterBaseServiceProviders implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public async bootstrap(): Promise<void> {
		await this.app.resolve(Log.ServiceProvider).register();

		await this.app.resolve(Triggers.ServiceProvider).register();

		await this.app.resolve(Filesystem.ServiceProvider).register();

		await this.app.resolve(Cache.ServiceProvider).register();

		await this.app.resolve(Pipeline.ServiceProvider).register();

		await this.app.resolve(Queue.ServiceProvider).register();

		await this.app.resolve(ProcessActions.ServiceProvider).register();

		await this.app.resolve(Validation.ServiceProvider).register();

		await this.app.resolve(Schedule.ServiceProvider).register();
	}
}
