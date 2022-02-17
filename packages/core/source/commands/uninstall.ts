import { Commands, Container } from "@arkecosystem/core-cli";

@Container.injectable()
export class Command extends Commands.Command {
	public signature: string = "uninstall";

	public description: string = "Completely uninstalls the Core installation."; //Will edit further when we add flags etc

	public async execute(): Promise<void> {
		this.components.fatal("This command has not been implemented.");
	}
}
