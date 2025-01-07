import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class TransactionResource {
	public async transform(transaction: Contracts.Crypto.TransactionData): Promise<object> {
		/* eslint-disable sort-keys-fix/sort-keys-fix */
		return {
			// blockHash: "0x1d59ff54b1eb26b013ce3cb5fc9dab3705b415a67127a003c3e61eb445bb8df2",
			// blockNumber: "0x5daf3b", // 6139707
			from: transaction.senderAddress,
			gas: `0x${transaction.gasLimit.toString(16)}`,
			gasPrice: `0x${transaction.gasPrice.toString(16)}`,
			hash: `0x${transaction.id}`,
			input: transaction.data === "0x" ? undefined : transaction.data,
			nonce: `0x${transaction.nonce.toString(16)}`,
			// eslint-disable-next-line unicorn/no-null
			to: transaction.recipientAddress || null,
			// transactionIndex: "0x41", // 65
			value: `0x${transaction.value.toString(16)}`,
			v: `0x${transaction.v}`,
			r: `0x${transaction.r}`,
			s: `0x${transaction.s}`,
			tx: transaction,
		};
		/* eslint-enable sort-keys-fix/sort-keys-fix */
	}
}
