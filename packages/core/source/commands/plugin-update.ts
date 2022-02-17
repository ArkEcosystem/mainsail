import { Commands, Container, Contracts } from "@arkecosystem/core-cli";
import { Networks } from "@arkecosystem/crypto";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	@Container.inject(Container.Identifiers.PluginManager)
	private readonly pluginManager!: Contracts.PluginManager;

	public signature: string = "plugin:update";

	public description: string = "Updates a package and any packages that it depends on.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string().default("ark"))
			.setFlag("network", "The name of the network.", Joi.string().valid(...Object.keys(Networks)))
			.setArgument("package", "The name of the package.", Joi.string().required());
	}

	public async execute(): Promise<void> {
		return await this.pluginManager.update(
			this.getFlag("token"),
			this.getFlag("network"),
			this.getArgument("package"),
		);
	}
}
