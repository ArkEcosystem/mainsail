import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { MemoryPipeline } from "./drivers/memory.js";

@injectable()
export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<<T>() => Contracts.Kernel.Pipeline<T>>(Identifiers.Services.Pipeline.Factory).toFactory(
			(context: Contracts.Kernel.Container.ResolutionContext) =>
				<T>(): Contracts.Kernel.Pipeline<T> =>
					context.get(MemoryPipeline<T>, { autobind: true }),
		);
	}
}
