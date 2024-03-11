import { Contracts } from "@mainsail/contracts";

import { InstanceManager } from "../../support/instance-manager.js";
import { Pm2ProcessActionsService } from "./drivers/pm2.js";

export class ProcessActionsManager extends InstanceManager<Contracts.Kernel.ProcessActionsService> {
	protected createPm2Driver(): Contracts.Kernel.ProcessActionsService {
		return this.app.resolve(Pm2ProcessActionsService);
	}

	protected getDefaultDriver(): string {
		return "pm2";
	}
}
