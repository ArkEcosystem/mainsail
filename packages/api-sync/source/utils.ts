import { Contracts } from "@mainsail/contracts";
import { ethers, InterfaceAbi } from "ethers";

export const tryParseReceiptError = (
	contracts: Contracts.Evm.DeployerContract[],
	receipt: Contracts.Evm.TransactionReceipt,
): string | undefined => {
	if (receipt.success) {
		return undefined;
	}

	if (!receipt.output || receipt.output.byteLength === 0) {
		return undefined;
	}

	for (const contract of contracts) {
		for (const { abi } of contract.implementations) {
			const iface = new ethers.Interface(abi as InterfaceAbi);
			const error = iface.parseError(receipt.output);
			if (!error) {
				continue;
			}

			// console.log("found error", contract.name, address, error);
			return error.name;
		}
	}

	return undefined;
};
