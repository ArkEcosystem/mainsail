import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class EthGetBalanceAction implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_getBalance";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 2,
		minItems: 2,

		prefixItems: [{ $ref: "address" }, { enum: ["latest", "finalized", "safe"], type: "string" }],
		type: "array",
	};

	public async handle(parameters: [string, string]): Promise<string> {
		// TODO: Fix
		// const walletRepository = this.stateService.getStore().walletRepository;

		// if (walletRepository.hasByAddress(parameters[0])) {
		// 	const wallet = walletRepository.findByAddress(parameters[0]);

		// 	return `0x${Number(wallet.getBalance()).toString(16)}`;
		// }

		return `0x0`;
	}
}
