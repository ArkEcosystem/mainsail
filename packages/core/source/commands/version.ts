import { Commands, Container } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import { PackageJson } from "type-fest";

@injectable()
export class Command extends Commands.Command {
	public signature = "version";

	public description = "Display the current installed version of Core.";

	public requiresNetwork = false;

	public async execute(): Promise<void> {
		console.log(this.app.get<PackageJson>(Container.Identifiers.Package).version);
	}
}
