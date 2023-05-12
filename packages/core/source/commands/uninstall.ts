import { Commands } from "@mainsail/cli";
import { injectable } from "@mainsail/container";

@injectable()
export class Command extends Commands.Command {
	public signature = "uninstall";

	public description = "Completely uninstalls the Core installation."; //Will edit further when we add flags etc

	public async execute(): Promise<void> {
		this.components.fatal("This command has not been implemented.");
	}
}
