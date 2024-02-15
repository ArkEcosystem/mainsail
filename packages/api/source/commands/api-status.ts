import { Commands, Contracts, Identifiers } from "@mainsail/cli";
import { injectable } from "@mainsail/container";

@injectable()
export class Command extends Commands.Command {
	public signature = "api:status";

	public description = "Display the status of the API process.";

	public async execute(): Promise<void> {
		this.app.get<Contracts.ProcessFactory>(Identifiers.ProcessFactory)("mainsail-api").status();
	}
}
