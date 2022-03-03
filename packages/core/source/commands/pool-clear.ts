import { Commands } from "@arkecosystem/core-cli";
import { injectable } from "@arkecosystem/core-container";
import { removeSync } from "fs-extra";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	public signature = "pool:clear";

	public description = "Clear the transaction pool.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("network", "The name of the network.", Joi.string());
	}

	public async execute(): Promise<void> {
		this.actions.abortRunningProcess(`${this.getFlag("token")}-core`);
		this.actions.abortRunningProcess(`${this.getFlag("token")}-forger`);
		this.actions.abortRunningProcess(`${this.getFlag("token")}-relay`);

		if (this.getFlag("false")) {
			return this.removeFiles();
		}

		try {
			if (
				await this.components.confirm(
					"Clearing the transaction pool will remove all queued transactions from your node. Are you sure you want to clear?",
				)
			) {
				this.removeFiles();
			}
		} catch (error) {
			this.components.fatal(error.message);
		}
	}

	private removeFiles() {
		removeSync(this.app.getCorePath("data", "transaction-pool"));
	}
}
