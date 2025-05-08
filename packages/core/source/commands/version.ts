import { Commands, Identifiers } from "@mainsail/cli";
import { injectable, injectFromBase } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
@injectFromBase()
export class Command extends Commands.Command {
	public signature = "version";

	public description = "Display the current installed version of Core.";

	public async execute(): Promise<void> {
		console.log(this.app.get<Contracts.Types.PackageJson>(Identifiers.Package).version);
	}
}
