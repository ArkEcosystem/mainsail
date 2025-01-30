import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { http } from "@mainsail/utils";

@injectable()
export class EthSendRawTransactionAction implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	public readonly name: string = "eth_sendRawTransaction";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,
		maxItems: 1,
		minItems: 1,

		prefixItems: [{ $ref: "prefixedHex" }],
		type: "array",
	};

	public async handle(parameters: [string]): Promise<string> {
		const response = await http.post("http://localhost:4007/api/transactions", {
			body: { transactions: [parameters[0].slice(2)] },
		});

		if (response.statusCode === 200) {
			if (response.data.data.accept.length > 0) {
				const tx = await this.transactionFactory.fromHex(parameters[0].slice(2));
				return `0x${tx.id}`;
			} else {
				throw new Exceptions.RpcError(response.data.errors[0].message);
			}
		}

		// TODO Improve error handling
		throw new Exceptions.RpcError("Error sending transaction");
	}
}
