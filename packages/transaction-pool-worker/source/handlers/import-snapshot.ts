import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ImportSnapshotHandler {
	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	public async handle(height: number): Promise<void> {
		await this.stateService.restore(height);
	}
}
