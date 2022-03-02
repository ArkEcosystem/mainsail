import { Kernel } from "@arkecosystem/core-contracts";
import { Identifiers, interfaces } from "../../ioc";
import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { MemoryPipeline } from "./drivers/memory";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.PipelineFactory)
			.toFactory(
				(context: interfaces.Context) => (): Kernel.Pipeline =>
					context.container.resolve<Kernel.Pipeline>(MemoryPipeline),
			);
	}
}
