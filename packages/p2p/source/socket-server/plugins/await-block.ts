import { Server } from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class AwaitBlockPlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public register(server: Server): void {
		server.ext({
			method: async (request, h) => {
				if (this.stateStore.getBlockchain().value !== "newBlock") {
					return h.continue;
				}

				// const queue = this.blockchain.getQueue();
				// if (!queue.isRunning()) {
				// 	return h.continue;
				// }

				// await new Promise<void>((resolve) => {
				// 	queue.once("drain", () => {
				// 		resolve();
				// 	});
				// });

				return h.continue;
			},
			type: "onPreAuth",
		});
	}
}
