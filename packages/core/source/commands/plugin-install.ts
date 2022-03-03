import { Commands, Container, Contracts } from "@arkecosystem/core-cli";
import { inject, injectable } from "@arkecosystem/core-container";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Container.Identifiers.PluginManager)
	private readonly pluginManager!: Contracts.PluginManager;

	public signature = "plugin:install";

	public description = "Installs a package, and any packages that it depends on.";

	public configure(): void {
		this.definition
			.setFlag("token", "The name of the token.", Joi.string())
			.setFlag("network", "The name of the network.", Joi.string())
			.setFlag("version", "The version of the package.", Joi.string())
			.setArgument("package", "The name of the package.", Joi.string().required());
	}

	public async execute(): Promise<void> {
		return await this.pluginManager.install(
			this.getFlag("token"),
			this.getFlag("network"),
			this.getArgument("package"),
			this.getFlag("version"),
		);
	}
}
