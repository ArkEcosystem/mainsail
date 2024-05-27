import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ImportSnapshotAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.State.Service)
	protected readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public readonly name: string = "import_snapshot";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		additionalProperties: false,
		properties: {
			height: {
				type: "number",
			},
		},
		required: ["height"],
		type: "object",
	};

	public async handle(
		parameters: Contracts.TransactionPool.Actions.ImportSnapshotsRequest,
	): Promise<Contracts.TransactionPool.Actions.ImportSnapshotsResponse> {
		try {
			await this.stateService.restore(parameters.height);
			return true;
		} catch (error) {
			this.logger.error(`Cannot import state snapshot because: ${error.message}`);
			throw error;
		}
	}
}
