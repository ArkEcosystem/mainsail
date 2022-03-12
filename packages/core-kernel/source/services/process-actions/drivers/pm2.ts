import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

@injectable()
export class Pm2ProcessActionsService implements Contracts.Kernel.ProcessActionsService {
	readonly #pmx;

	public constructor() {
		this.#pmx = require("@pm2/io");
	}

	public register(remoteAction: Contracts.Kernel.ProcessAction): void {
		this.#pmx.action(remoteAction.name, (reply) => {
			remoteAction
				.handler()
				.then((response) => {
					reply({ response: response });
				})
				.catch((error) => {
					reply({ error: error.stack });
				});
		});
	}
}
