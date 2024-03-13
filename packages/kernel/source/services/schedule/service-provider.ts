import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { Schedule } from "./schedule.js";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<Schedule>(Identifiers.Services.Schedule.Service).to(Schedule).inSingletonScope();
	}
}
