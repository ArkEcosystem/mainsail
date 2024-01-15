import { Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { Schedule } from "./schedule";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<Schedule>(Identifiers.Services.Schedule.Service).to(Schedule).inSingletonScope();
	}
}
