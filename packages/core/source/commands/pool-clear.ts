import { Commands } from "@mainsail/cli";
import { injectable, postConstruct } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";
import { removeSync } from "fs-extra/esm";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "pool:clear";

	public description = "Clear the transaction pool.";

	@postConstruct()
	public configure(): void {
		this.definition.setFlag(
			"force",
			"Clear the transaction pool without confirmation.",
			Joi.boolean().default(false),
		);
	}

	public async execute(): Promise<void> {
		this.actions.abortRunningProcess(`mainsail`);

		if (this.getFlag<boolean>("force")) {
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
