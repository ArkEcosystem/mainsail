import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ListSnapshotsAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.State.Snapshot.Service)
	protected readonly snapshotService!: Contracts.State.SnapshotService;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public readonly name: string = "list_snapshots";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		additionalProperties: false,
		type: "object",
	};

	public async handle(
		parameters: Contracts.TransactionPool.Actions.ListSnapshotsRequest,
	): Promise<Contracts.TransactionPool.Actions.ListSnapshotsResponse> {
		try {
			return this.snapshotService.listSnapshots();
		} catch (error) {
			this.logger.error(error.message);

			return [];
		}
	}
}
