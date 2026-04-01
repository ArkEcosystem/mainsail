import type { Contracts } from "@mainsail/contracts";

import { Commands } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";

@injectable()
export class Command extends Commands.Command {
	public signature = "api:restart";

	public description = "Restart the API process.";

	public async execute(): Promise<void> {
		this.app.get<Contracts.Cli.ProcessFactory>(Identifiers.Cli.ProcessFactory)("mainsail-api").restart();
	}
}
