import { Pipeline } from "../../contracts/kernel";
import { Identifiers, interfaces } from "../../ioc";
import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { MemoryPipeline } from "./drivers/memory";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.PipelineFactory)
			.toFactory(
				(context: interfaces.Context) => (): Pipeline => context.container.resolve<Pipeline>(MemoryPipeline),
			);
	}
}
