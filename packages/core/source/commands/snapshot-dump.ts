import { Commands, Components, Container, Contracts, Utils } from "@arkecosystem/core-cli";
import { Container as KernelContainer, Contracts as KernelContracts } from "@arkecosystem/core-kernel";
import { ProgressRenderer } from "@arkecosystem/core-snapshots";
import { Networks } from "@arkecosystem/crypto";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "snapshot:dump";

	public description = "Create a full snapshot of the database.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().default("ark"))
			.setFlag("network", "The name of the network.", Joi.string().valid(...Object.keys(Networks)))
			.setFlag("codec", "The name of the codec.", Joi.string().valid("default", "json"))
			.setFlag("skipCompression", "Skip gzip compression.", Joi.boolean())
			.setFlag("start", "The start network height to export.", Joi.number())
			.setFlag("end", "The end network height to export.", Joi.number());
	}

	public async execute(): Promise<void> {
		const flags: Contracts.AnyObject = { ...this.getFlags() };
		flags.processType = "snapshot";

		const app = await Utils.buildApplication({
			flags,
		});

		const spinner = this.app.get<Components.ComponentFactory>(Container.Identifiers.ComponentFactory).spinner();
		new ProgressRenderer(spinner, app);

		await app
			.get<KernelContracts.Snapshot.SnapshotService>(KernelContainer.Identifiers.SnapshotService)
			.dump(flags as any);

		await app.terminate();
	}
}
