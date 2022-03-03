import { interfaces } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { MemoryPipeline } from "./drivers/memory";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.PipelineFactory)
			.toFactory(
				(context: interfaces.Context) => (): Contracts.Kernel.Pipeline =>
					context.container.resolve<Contracts.Kernel.Pipeline>(MemoryPipeline),
			);
	}
}
