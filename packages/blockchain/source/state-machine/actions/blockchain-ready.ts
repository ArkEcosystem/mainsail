import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/core-contracts";
import { Enums } from "@mainsail/core-kernel";

import { Action } from "../contracts";

@injectable()
export class BlockchainReady implements Action {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	public async handle(): Promise<void> {
		if (!this.stateStore.isStarted()) {
			this.stateStore.setStarted(true);

			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this.events.dispatch(Enums.StateEvent.Started, true);
		}
	}
}
