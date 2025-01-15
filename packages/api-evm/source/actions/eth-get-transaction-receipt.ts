import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { ReceiptResource } from "../resources/index.js";

@injectable()
export class EthGetTransactionReceipt implements Contracts.Api.RPC.Action {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

	public readonly name: string = "eth_getTransactionReceipt";

	public readonly schema = {
		$id: `jsonRpc_${this.name}`,

		maxItems: 1,
		minItems: 1,

		prefixItems: [
			{ $ref: "prefixedHex" }, // TODO: Extract transaction id
		],
		type: "array",
	};

	// https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_gettransactionreceipt
	public async handle(parameters: [string, boolean]): Promise<object | null> {
		const transaction = await this.databaseService.getTransactionById(parameters[0].slice(2));

		if (!transaction) {
			// eslint-disable-next-line unicorn/no-null
			return null;
		}

		Utils.assert.defined(transaction.data.blockHeight);

		const { receipt } = await this.evm.getReceipt(transaction.data.blockHeight, transaction.id);
		if (!receipt) {
			// eslint-disable-next-line unicorn/no-null
			return null;
		}

		return this.app.resolve(ReceiptResource).transform(transaction.data, receipt);
	}
}
