import { Commands, Identifiers } from "@mainsail/cli";
import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class Command extends Commands.Command {
	public signature = "version";

	public description = "Display the current installed version of API.";

	public async execute(): Promise<void> {
		console.log(this.app.get<Contracts.Types.PackageJson>(Identifiers.Package).version);
	}
}
