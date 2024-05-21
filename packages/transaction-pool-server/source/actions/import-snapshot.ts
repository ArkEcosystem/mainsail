import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ImportSnapshotAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.State.Snapshot.Service)
	protected readonly snapshotService!: Contracts.State.SnapshotService;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public readonly name: string = "import_snapshot";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		type: "object",
	};

	public async handle(parameters: any): Promise<any> {}
}
