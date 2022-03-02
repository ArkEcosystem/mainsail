import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container } from "@arkecosystem/core-kernel";

@Container.injectable()
export class Controller {
	@Container.inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.LogService)
	protected readonly logger!: Contracts.Kernel.Logger;
}
