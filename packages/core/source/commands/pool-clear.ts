import { Commands } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";
import { removeSync } from "fs-extra/esm";

@injectable()
export class Command extends Commands.Command {
	public signature = "pool:clear";

	public description = "Clear the transaction pool.";

	public async execute(): Promise<void> {
		this.actions.abortRunningProcess(`mainsail`);

		if (this.getFlag("false")) {
			return this.#removeFiles();
		}

		try {
			if (
				await this.components.confirm(
					"Clearing the transaction pool will remove all queued transactions from your node. Are you sure you want to clear?",
				)
			) {
				this.#removeFiles();
			}
		} catch (rawError) {
			const error = ensureError(rawError);
			this.components.fatal(error.message);
		}
	}

	#removeFiles() {
		removeSync(this.app.getCorePath("data", "transaction-pool"));
	}
}
