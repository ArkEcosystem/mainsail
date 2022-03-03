import { Identifiers } from "@arkecosystem/core-contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { Schedule } from "./schedule";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<Schedule>(Identifiers.ScheduleService).to(Schedule).inSingletonScope();
	}
}
