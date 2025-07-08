import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class TransactionResource {
	public async transform(transaction: Contracts.Crypto.TransactionData): Promise<object> {
		/* eslint-disable sort-keys-fix/sort-keys-fix */
		return {
			blockHash: `0x${transaction.blockHash}`,
			blockNumber: `0x${transaction.blockNumber?.toString(16)}`,
			chainId: `0x${transaction.network.toString(16)}`,
			from: transaction.from,
			gas: `0x${transaction.gasLimit.toString(16)}`,
			gasPrice: `0x${transaction.gasPrice.toString(16)}`,
			hash: `0x${transaction.hash}`,
			input: `0x${transaction.data}`,
			maxPriorityFeePerGas: `0x0`,
			maxFeePerGas: `0x${transaction.gasPrice.toString(16)}`,
			nonce: `0x${transaction.nonce.toString(16)}`,
			// eslint-disable-next-line unicorn/no-null
			to: transaction.to || null,
			transactionIndex: `0x${transaction.transactionIndex?.toString(16)}`,
			value: `0x${transaction.value.toString(16)}`,
			type: `0x2`,
			v: `0x${transaction.v}`,
			r: `0x${transaction.r}`,
			s: `0x${transaction.s}`,
		};
		/* eslint-enable sort-keys-fix/sort-keys-fix */
	}
}
