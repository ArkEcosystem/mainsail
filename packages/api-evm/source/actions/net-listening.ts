import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class NetListeningAction implements Contracts.Api.RPC.Action {
	public readonly name: string = "net_listening";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 0,
		type: "array",
	};

	public async handle(parameters: []): Promise<boolean> {
		return true;
	}
}
