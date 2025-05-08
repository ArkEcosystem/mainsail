import { injectable, injectFromBase } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { Schedule } from "./schedule.js";

@injectable()
@injectFromBase()
export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<Schedule>(Identifiers.Services.Schedule.Service).to(Schedule).inSingletonScope();
	}
}
