import { Commands, Contracts, Services } from "@arkecosystem/core-cli";
import { prettyBytes, prettyTime } from "@arkecosystem/utils";
import dayjs from "dayjs";
import Joi from "joi";

@injectable()
export class Command extends Commands.Command {
	@inject(Container.Identifiers.ProcessManager)
	private readonly processManager!: Services.ProcessManager;

	public signature = "top";

	public description = "List all Core daemons.";

	public requiresNetwork = false;

	public configure(): void {
		this.definition.setFlag("token", "The name of the token.", Joi.string());
	}

	public async execute(): Promise<void> {
		const processes: Contracts.ProcessDescription[] = (this.processManager.list() || []).filter(
			(p: Contracts.ProcessDescription) => p.name.startsWith(this.getFlag("token")),
		);

		if (!processes || Object.keys(processes).length === 0) {
			this.components.fatal("No processes are running.");
		}

		this.components.table(["ID", "Name", "Version", "Status", "Uptime", "CPU", "RAM"], (table) => {
			for (const process of processes) {
				// @ts-ignore
				table.push([
					process.pid,
					process.name,
					// @ts-ignore
					process.pm2_env.version,
					process.pm2_env.status,
					prettyTime(dayjs().diff(process.pm2_env.pm_uptime)),
					`${process.monit.cpu}%`,
					prettyBytes(process.monit.memory),
				]);
			}
		});
	}
}
