import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Web3ClientVersionAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Application.Version)
	private readonly version!: string;

	public readonly name: string = "web3_clientVersion";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 0,
		type: "array",
	};

	public async handle(parameters: []): Promise<string> {
		return `@mainsail/core/${this.version}/${process.platform}-${process.arch}/node-${process.version}`;
	}
}
