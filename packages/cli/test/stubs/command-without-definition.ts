import { injectable } from "@mainsail/container";

import { Commands } from "../../source";

@injectable()
export class CommandWithoutDefinition extends Commands.Command {
	public signature = "config:cli";
	public description = "Update the CLI configuration.";

	public async execute(): Promise<void> {
		// Do nothing...
	}
}
