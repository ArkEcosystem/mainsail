import { Kernel } from "@arkecosystem/core-contracts";
import { InstanceManager } from "../../support/instance-manager";
import { Pm2ProcessActionsService } from "./drivers/pm2";

export class ProcessActionsManager extends InstanceManager<Kernel.ProcessActionsService> {
	protected createPm2Driver(): Kernel.ProcessActionsService {
		return this.app.resolve(Pm2ProcessActionsService);
	}

	protected getDefaultDriver(): string {
		return "pm2";
	}
}
