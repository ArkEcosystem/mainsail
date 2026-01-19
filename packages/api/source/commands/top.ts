import { Commands, Services } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { prettyBytes, prettyTime } from "@mainsail/utils";
import dayjs from "dayjs";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.Cli.Service.ProcessManager)
	private readonly processManager!: Services.ProcessManager;

	public signature = "top";

	public description = "List all Core daemons.";

	public async execute(): Promise<void> {
		const processes: Contracts.Cli.ProcessDescription[] = (this.processManager.list() || []).filter(
			(p: Contracts.Cli.ProcessDescription) => p.name.startsWith("mainsail"),
		);

		if (!processes || Object.keys(processes).length === 0) {
			this.components.fatal("No processes are running.");
		}

		this.components.table(["ID", "Name", "Version", "Status", "Uptime", "CPU", "RAM"], (table) => {
			for (const process of processes) {
				table.push([
					process.pid,
					process.name,
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
