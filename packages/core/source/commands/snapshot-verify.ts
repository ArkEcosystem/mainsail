import { Commands, Components, Container, Contracts, Utils } from "@arkecosystem/core-cli";
import { Container as KernelContainer, Contracts as KernelContracts } from "@arkecosystem/core-kernel";
import { ProgressRenderer } from "@arkecosystem/core-snapshots";
import { Networks } from "@arkecosystem/crypto";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	public signature = "snapshot:verify";

	public description = "Check validity of specified snapshot.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().default("ark"))
			.setFlag("network", "The name of the network.", Joi.string().valid(...Object.keys(Networks)))
			.setFlag("blocks", "Blocks to verify, correlates to folder name.", Joi.string().required());
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
			.verify(flags as any);

		await app.terminate();
	}
}
