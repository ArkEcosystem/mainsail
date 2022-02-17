import { Commands, Container, Contracts, Services } from "@arkecosystem/core-cli";
import { prettyBytes, prettyTime } from "@arkecosystem/utils";
import dayjs from "dayjs";
import Joi from "joi";

@Container.injectable()
export class Command extends Commands.Command {
	@Container.inject(Container.Identifiers.ProcessManager)
	private readonly processManager!: Services.ProcessManager;

	public signature: string = "top";

	public description: string = "List all Core daemons.";

	public requiresNetwork: boolean = false;

	public configure(): void {
		this.definition.setFlag("token", "The name of the token.", Joi.string().default("ark"));
	}

	public async execute(): Promise<void> {
		const processes: Contracts.ProcessDescription[] = (this.processManager.list() || []).filter(
			(p: Contracts.ProcessDescription) => p.name.startsWith(this.getFlag("token")),
		);

		if (!processes || !Object.keys(processes).length) {
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
