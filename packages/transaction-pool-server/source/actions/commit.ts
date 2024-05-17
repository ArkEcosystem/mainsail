import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class CommitAction implements Contracts.Api.RPC.Action {
	public readonly name: string = "commit";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		type: "object",
	};

	public async handle(parameters: any): Promise<any> {
		console.log(parameters);

		return { success: true };
	}
}
