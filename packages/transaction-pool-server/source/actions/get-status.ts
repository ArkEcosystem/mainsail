import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class GetStatusAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Service)
	protected readonly stateService!: Contracts.State.Service;

	public readonly name: string = "get_status";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		type: "object",
	};

	public async handle(parameters: any): Promise<any> {
		return {
			height: this.stateService.getStore().getLastHeight(),
			version: this.app.version(),
		};
	}
}
