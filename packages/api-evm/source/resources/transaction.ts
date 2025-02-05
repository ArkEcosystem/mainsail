import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class TransactionResource {
	public async transform(transaction: Contracts.Crypto.TransactionData): Promise<object> {
		/* eslint-disable sort-keys-fix/sort-keys-fix */
		return {
			blockHash: `0x${transaction.blockId}`,
			blockNumber: `0x${transaction.blockHeight?.toString(16)}`,
			from: transaction.senderAddress,
			gas: `0x${transaction.gasLimit.toString(16)}`,
			gasPrice: `0x${transaction.gasPrice.toString(16)}`,
			hash: `0x${transaction.id}`,
			input: `0x${transaction.data}`,
			nonce: `0x${transaction.nonce.toString(16)}`,
			// eslint-disable-next-line unicorn/no-null
			to: transaction.recipientAddress || null,
			transactionIndex: `0x${transaction.sequence?.toString(16)}`,
			value: `0x${transaction.value.toString(16)}`,
			v: `0x${transaction.v}`,
			r: `0x${transaction.r}`,
			s: `0x${transaction.s}`,
		};
		/* eslint-enable sort-keys-fix/sort-keys-fix */
	}
}
