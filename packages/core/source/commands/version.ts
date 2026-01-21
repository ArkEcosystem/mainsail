import { Commands } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class Command extends Commands.Command {
	public signature = "version";

	public description = "Display the current installed version of Core.";

	public async execute(): Promise<void> {
		console.log(this.app.get<Contracts.Types.PackageJson>(Identifiers.Cli.Package).version);
	}
}
