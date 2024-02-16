import { Commands, Contracts, Identifiers, Services } from "@mainsail/cli";
import { inject, injectable } from "@mainsail/container";
import { prettyBytes, prettyTime } from "@mainsail/utils";
import dayjs from "dayjs";

@injectable()
export class Command extends Commands.Command {
	@inject(Identifiers.ProcessManager)
	private readonly processManager!: Services.ProcessManager;

	public signature = "top";

	public description = "List all Core daemons.";

	public async execute(): Promise<void> {
		const processes: Contracts.ProcessDescription[] = (this.processManager.list() || []).filter(
			(p: Contracts.ProcessDescription) => p.name.startsWith("mainsail"),
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
