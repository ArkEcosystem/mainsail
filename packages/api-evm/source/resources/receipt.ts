import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class ReceiptResource {
	public async transform(
		transaction: Contracts.Crypto.TransactionData,
		header: Contracts.Crypto.BlockHeader,
		receipt: Contracts.Evm.TransactionReceipt,
	): Promise<object> {
		/* eslint-disable sort-keys-fix/sort-keys-fix */
		return {
			transactionHash: `0x${transaction.id}`,
			transactionIndex: `0x${transaction.sequence?.toString(16)}`,
			blockHash: `0x${transaction.blockId}`,
			blockNumber: `0x${transaction.blockHeight?.toString(16)}`,
			from: transaction.senderAddress,
			to: transaction.recipientAddress,
			// TODO: Calculate
			cumulativeGasUsed: "0x0", // The sum of the base fee and tip paid per unit of gas.
			effectiveGasUsed: "0x0", // The total amount of gas used when this transaction was executed in the block.
			gasUsed: `0x${receipt.gasUsed.toString(16)}`,
			contractAddress: receipt.deployedContractAddress,
			logs: receipt.logs,
			logsBloom: `0x${header.logsBloom}`,
			type: "0x2",
			status: receipt.success ? "0x1" : "0x0",
		};
		/* eslint-enable sort-keys-fix/sort-keys-fix */
	}
}
