import { Commands, Container } from "@arkecosystem/core-cli";
import { Networks } from "@arkecosystem/crypto";
import { removeSync } from "fs-extra";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "pool:clear";

	public description = "Clear the transaction pool.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().default("ark"))
			.setFlag("network", "The name of the network.", Joi.string().valid(...Object.keys(Networks)));
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
