import { Models } from "@mainsail/api-database";
import type { Contracts } from "@mainsail/contracts";
import { parseAbi, parseEventLogs } from "viem";

const paymentAbi = parseAbi(["event Payment(address indexed recipient, uint256 amount, bool success)"] as const);

export function parseMultiPayments(
	multiPaymentContractAddress: string,
	transaction: Contracts.Crypto.Transaction,
	receipt: Contracts.Evm.TransactionReceipt,
): Models.MultiPayment[] {
	if (transaction.data.to !== multiPaymentContractAddress) {
		return [];
	}

	const payments = parseEventLogs({
		abi: paymentAbi,
		eventName: "Payment",
		logs: receipt.logs ?? [],
	});

	return payments.map((payment, logIndex) => {
		const { recipient, amount, success } = payment.args;

		return {
			amount: amount.toString(),
			hash: transaction.data.hash,
			logIndex,
			success,
			to: recipient,
		};
	});
}
