import { interfaces } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { MemoryPipeline } from "./drivers/memory.js";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Services.Pipeline.Factory)
			.toFactory(
				(context: interfaces.Context) => (): Contracts.Kernel.Pipeline =>
					context.container.resolve<Contracts.Kernel.Pipeline>(MemoryPipeline),
			);
	}
}
