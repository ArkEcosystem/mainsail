import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Identifiers } from "@arkecosystem/core-contracts";

@injectable()
export class Controller {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	protected readonly logger!: Contracts.Kernel.Logger;
}
