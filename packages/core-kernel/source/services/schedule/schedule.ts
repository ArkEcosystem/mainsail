import { Application } from "../../contracts/kernel";
import { Identifiers, inject, injectable } from "../../ioc";
import { BlockJob } from "./block-job";
import { CronJob } from "./cron-job";

@injectable()
export class Schedule {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	public cron(): CronJob {
		return this.app.resolve<CronJob>(CronJob);
	}

	public block(): BlockJob {
		return this.app.resolve<BlockJob>(BlockJob);
	}
}
