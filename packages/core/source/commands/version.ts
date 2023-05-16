import { Commands, Identifiers } from "@mainsail/cli";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class Command extends Commands.Command {
	public signature = "version";

	public description = "Display the current installed version of Core.";

	public requiresNetwork = false;

	public async execute(): Promise<void> {
		console.log(this.app.get<Contracts.Types.PackageJson>(Identifiers.Package).version);
	}
}
