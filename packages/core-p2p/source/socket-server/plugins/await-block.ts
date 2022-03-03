import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { inject, injectable } from "@arkecosystem/core-container";
import { Server } from "@hapi/hapi";

import { InternalRoute } from "../routes/internal";

@injectable()
export class AwaitBlockPlugin {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public register(server: Server): void {
		const peerRoutesConfigByPath = this.app.resolve(InternalRoute).getRoutesConfigByPath();

		server.ext({
			method: async (request, h) => {
				if (peerRoutesConfigByPath[request.path]) {
					return h.continue;
				}

				if (this.stateStore.getBlockchain().value !== "newBlock") {
					return h.continue;
				}

				const queue = this.blockchain.getQueue();
				if (!queue.isRunning()) {
					return h.continue;
				}

				await new Promise<void>((resolve) => {
					queue.once("drain", () => {
						resolve();
					});
				});

				return h.continue;
			},
			type: "onPreAuth",
		});
	}
}
