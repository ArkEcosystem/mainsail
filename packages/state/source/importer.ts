// @ts-nocheck
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Importer {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	async import(height: number): Promise<void> {
		// ...
	}
}
