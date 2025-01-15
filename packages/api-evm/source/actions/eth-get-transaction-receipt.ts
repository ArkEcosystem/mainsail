import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class EthGetTransactionReceipt implements Contracts.Api.RPC.Action {
	public readonly name: string = "eth_getTransactionReceipt";

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.DatabaseService;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

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
			return null;
		}

		Utils.assert.defined(transaction.data.blockHeight);

		const { receipt } = await this.evm.getReceipt(transaction.data.blockHeight, transaction.id);
		if (!receipt) {
			return null;
		}

		/* eslint-disable sort-keys-fix/sort-keys-fix */
		return {
			blockHash: transaction.data.blockId,
			blockNumber: `0x${transaction.data.blockHeight?.toString(16)}`,
			contractAddress: receipt.deployedContractAddress,
			cumulativeGasUsed: "", // The sum of the base fee and tip paid per unit of gas.
			effectiveGasUsed: "", // The total amount of gas used when this transaction was executed in the block.

			from: transaction.data.senderAddress,
			gasUsed: `0x${receipt.gasUsed.toString(16)}`,
			logs: receipt.logs,
			logsBloom: "",
			status: receipt.success ? "0x1" : "0x0",
			to: transaction.data.recipientAddress,
			transactionHash: transaction.id,
			transactionIndex: `0x${transaction.data.sequence?.toString(16)}`,
			type: "0x2",
		};
		/* eslint-enable sort-keys-fix/sort-keys-fix */
	}
}
