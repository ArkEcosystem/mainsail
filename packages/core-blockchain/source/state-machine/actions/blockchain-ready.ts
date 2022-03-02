import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container, Enums } from "@arkecosystem/core-kernel";

import { Action } from "../contracts";

@Container.injectable()
export class BlockchainReady implements Action {
	@Container.inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@Container.inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	public async handle(): Promise<void> {
		if (!this.stateStore.isStarted()) {
			this.stateStore.setStarted(true);

			this.events.dispatch(Enums.StateEvent.Started, true);
		}
	}
}
