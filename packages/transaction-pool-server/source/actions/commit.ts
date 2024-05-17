import { injectable, inject } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommitAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.State.Service)
	protected readonly stateService!: Contracts.State.Service;

	public readonly name: string = "commit";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		type: "object",
	};

	public async handle(parameters: any): Promise<any> {
		try {
			const store = this.stateService.createStoreClone();

			store.applyChanges(parameters);
			store.commitChanges();
		} catch (error) {
			console.log(error);
			return { success: false, error: error.message };
		}

		return { success: true };
	}
}
