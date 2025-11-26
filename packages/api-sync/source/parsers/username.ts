import type { Contracts } from "@mainsail/contracts";
import type { Log } from "viem";
import { parseAbi, parseEventLogs } from "viem";

const paymentAbi = parseAbi([
	"event UsernameRegistered(address addr, string username, string previousUsername)",
	"event UsernameResigned(address addr, string username)",
] as const);

export function parseUsernames(
	usernamesContractAddress: string,
	transaction: Contracts.Crypto.Transaction,
	receipt: Contracts.Evm.TransactionReceipt,
): { address: string; username: string | undefined }[] {
	if (transaction.data.to !== usernamesContractAddress) {
		return [];
	}

	const logs = parseEventLogs({
		abi: paymentAbi,
		//eventName: "UsernameRegistered",
		logs: (receipt.logs ?? []) as Log[],
	});

	return logs.map((l) => {
		switch (l.eventName) {
			case "UsernameRegistered": {
				return { address: l.args.addr, username: l.args.username };
			}

			case "UsernameResigned": {
				return { address: l.args.addr, username: undefined };
			}
		}
	});
}
