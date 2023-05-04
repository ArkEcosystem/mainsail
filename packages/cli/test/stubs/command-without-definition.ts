import { Commands, Container } from "../../source";

@Container.injectable()
export class CommandWithoutDefinition extends Commands.Command {
	public signature = "config:cli";
	public description = "Update the CLI configuration.";

	public async execute(): Promise<void> {
		// Do nothing...
	}
}
