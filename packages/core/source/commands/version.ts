import { Commands, Container } from "@arkecosystem/core-cli";
import { PackageJson } from "type-fest";

@Container.injectable()
export class Command extends Commands.Command {
	public signature: string = "version";

	public description: string = "Display the current installed version of Core.";

	public requiresNetwork: boolean = false;

	public async execute(): Promise<void> {
		console.log(this.app.get<PackageJson>(Container.Identifiers.Package).version);
	}
}
