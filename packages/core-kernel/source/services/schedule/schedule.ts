import { inject, injectable } from "@mainsail/core-container";
import { Contracts, Identifiers } from "@mainsail/core-contracts";

import { BlockJob } from "./block-job";
import { CronJob } from "./cron-job";

@injectable()
export class Schedule {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public cron(): CronJob {
		return this.app.resolve<CronJob>(CronJob);
	}

	public block(): BlockJob {
		return this.app.resolve<BlockJob>(BlockJob);
	}
}
