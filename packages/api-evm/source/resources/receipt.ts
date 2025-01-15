import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class ReceiptResource {
	public async transform(
		transaction: Contracts.Crypto.TransactionData,
		receipt: Contracts.Evm.TransactionReceipt,
	): Promise<object> {
		/* eslint-disable sort-keys-fix/sort-keys-fix */
		return {
			blockHash: transaction.blockId,
			blockNumber: `0x${transaction.blockHeight?.toString(16)}`,
			contractAddress: receipt.deployedContractAddress,
			cumulativeGasUsed: "", // The sum of the base fee and tip paid per unit of gas.
			effectiveGasUsed: "", // The total amount of gas used when this transaction was executed in the block.

			from: transaction.senderAddress,
			gasUsed: `0x${receipt.gasUsed.toString(16)}`,
			logs: receipt.logs,
			logsBloom: "",
			status: receipt.success ? "0x1" : "0x0",
			to: transaction.recipientAddress,
			transactionHash: transaction.id,
			transactionIndex: `0x${transaction.sequence?.toString(16)}`,
			type: "0x2",
		};
		/* eslint-enable sort-keys-fix/sort-keys-fix */
	}
}
