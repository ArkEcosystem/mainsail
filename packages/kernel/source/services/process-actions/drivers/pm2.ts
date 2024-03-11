import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class Pm2ProcessActionsService implements Contracts.Kernel.ProcessActionsService {
	#pmx;

	public constructor() {}

	public async register(remoteAction: Contracts.Kernel.ProcessAction): Promise<void> {
		this.#pmx = await import("@pm2/io");

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
