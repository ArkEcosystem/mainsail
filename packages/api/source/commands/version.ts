import type { Contracts } from "@mainsail/contracts";

import { Commands } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable, inject } from "@mainsail/container";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Cli.Service.Logger)
	private readonly logger!: Contracts.Cli.Logger;

	public signature = "version";

	public description = "Display the current installed version of API.";

	public async execute(): Promise<void> {
		this.logger.info(this.app.get<{ version: string }>(Identifiers.Cli.Package).version);
	}
}
