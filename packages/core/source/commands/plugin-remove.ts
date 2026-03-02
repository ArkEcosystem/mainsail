import { Commands } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Cli.Service.PluginManager)
	private readonly pluginManager!: Contracts.Cli.PluginManager;

	public signature = "plugin:remove";

	public description = "Removes a package and any packages that it depends on.";

	@postConstruct()
	public configure(): void {
		this.definition.setArgument("package", "The name of the package.", Joi.string().required());
	}

	public async execute(): Promise<void> {
		return await this.pluginManager.remove(this.getArgument("package"));
	}
}
