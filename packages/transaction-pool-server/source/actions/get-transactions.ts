import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class GetTransactionsAction implements Contracts.Api.RPC.Action {
	public readonly name: string = "get_transactions";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		type: "object",
	};

	public async handle(parameters: any): Promise<any> {
		return [];
	}
}
