import { Contracts } from "@mainsail/contracts";
import { ConsensusAbi, MultiPaymentAbi, UsernamesAbi } from "@mainsail/evm-contracts";
import { Abi, AbiItem, decodeErrorResult, toHex } from "viem";

const errorAbis = collectErrorItems([ConsensusAbi.abi, MultiPaymentAbi.abi, UsernamesAbi.abi] as Abi[]);

export function parseTransactionError(
	transaction: Contracts.Crypto.Transaction,
	receipt: Contracts.Evm.TransactionReceipt,
): string | undefined {
	if (receipt.status === 1) {
		return undefined;
	}

	if (!receipt.output || receipt.output.byteLength === 0) {
		if (receipt.gasUsed >= transaction.data.gasLimit) {
			return "out of gas";
		}

		// TODO: proxy contracts might not use up all gas when they run out of gas (due to DELEGATECALL)
	} else {
		const data = toHex(receipt.output);

		try {
			const decoded = decodeErrorResult({ abi: errorAbis, data });
			return formatErrorArguments(decoded.errorName, decoded.args);
		} catch {}
	}

	return "execution reverted";
}

function formatErrorArguments(errorName: string, arguments_?: readonly unknown[]): string {
	if (!arguments_ || arguments_.length === 0) {
		return errorName;
	}

	// Panic(uint256)
	if (errorName === "Panic") {
		const codeBig = arguments_?.[0] as bigint | number | undefined;
		if (codeBig === undefined) {
			return "Panic";
		}

		const code = typeof codeBig === "bigint" ? Number(codeBig) : Number(codeBig);
		const hex = `0x${code.toString(16)}`;
		const reason = panicReasons[code as keyof typeof panicReasons];
		return reason ? `Panic (${hex}): ${reason}` : `Panic (${hex})`;
	}

	const rendered = arguments_
		.map((a) => (typeof a === "bigint" ? a.toString() : typeof a === "string" ? a : JSON.stringify(a)))
		.join(",");

	return `${errorName} (${rendered})`;
}

function collectErrorItems(abis: Abi[]): AbiItem[] {
	const builtinErrorAbi: Abi = [
		{ inputs: [{ name: "message", type: "string" }], name: "Error", type: "error" },
		{ inputs: [{ name: "code", type: "uint256" }], name: "Panic", type: "error" },
	];

	const items: AbiItem[] = [];
	for (const abi of [...abis, builtinErrorAbi]) {
		for (const item of abi as AbiItem[]) {
			if (item?.type === "error") {
				items.push(item);
			}
		}
	}

	return items;
}

// https://docs.soliditylang.org/en/v0.8.16/control-structures.html#panic-via-assert-and-error-via-require
const panicReasons = {
	1: "An `assert` condition failed",
	17: "Arithmetic operation resulted in underflow or overflow",
	18: "Division or modulo by zero",
	33: "Attempted to convert to an invalid type",
	34: "Attempted to access a storage byte array that is incorrectly encoded",
	49: "Performed `.pop()` on an empty array",
	50: "Array index is out of bounds",
	65: "Allocated too much memory or created an array which is too large",
	81: "Attempted to call a zero-initialized variable of internal function type",
} as const;
