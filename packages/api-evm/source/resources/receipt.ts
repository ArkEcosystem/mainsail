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
			transactionHash: `0x${transaction.hash}`,
			transactionIndex: `0x${transaction.transactionIndex?.toString(16)}`,
			blockHash: `0x${transaction.blockHash}`,
			blockNumber: `0x${transaction.blockNumber?.toString(16)}`,
			from: transaction.from,
			to: transaction.to,
			// TODO: Calculate
			cumulativeGasUsed: "0x0", // The sum of the base fee and tip paid per unit of gas.
			effectiveGasUsed: "0x0", // The total amount of gas used when this transaction was executed in the block.
			gasUsed: `0x${receipt.gasUsed.toString(16)}`,
			contractAddress: receipt.contractAddress,
			logs: receipt.logs,
			logsBloom: `0x${header.logsBloom}`,
			type: "0x2",
			status: receipt.status ? "0x1" : "0x0",
		};
		/* eslint-enable sort-keys-fix/sort-keys-fix */
	}
}
