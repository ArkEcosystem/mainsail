import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { encodeRlp, toBeArray } from "ethers";

@injectable()
export class Serializer implements Contracts.Crypto.TransactionSerializer {
	public async serialize(
		transaction: Contracts.Crypto.Transaction,
		options: Contracts.Crypto.SerializeOptions = {},
	): Promise<Buffer> {
		const fields = [
			toBeArray(transaction.data.network), // chainId - 0
			toBeArray(transaction.data.nonce.toBigInt()), // nonce - 1
			toBeArray(0), // maxPriorityFeePerGas - 2
			toBeArray(transaction.data.gasPrice), // maxFeePerGas - 3
			toBeArray(transaction.data.gas), // gasLimit - 4
			transaction.data.to || "0x", // to - 5
			toBeArray(transaction.data.value.toBigInt()), // value - 6
			transaction.data.data.startsWith("0x") ? transaction.data.data : `0x${transaction.data.data}`, // data - 7
			[], //accessList - 8
		];

		if (transaction.data.v !== undefined && transaction.data.r && transaction.data.s && !options.excludeSignature) {
			// 9, 10, 11
			fields.push(toBeArray(transaction.data.v), `0x${transaction.data.r}`, `0x${transaction.data.s}`);

			if (transaction.data.legacySecondSignature) {
				// 12
				fields.push(`0x${transaction.data.legacySecondSignature}`);
			}
		}

		const rlpEncoded = encodeRlp(fields);

		const eip1559Prefix = "02"; // marker for Type 2 (EIP1559) transaction which is the standard nowadays

		transaction.serialized = Buffer.from(`${eip1559Prefix}${rlpEncoded.slice(2)}`, "hex");

		return transaction.serialized;
	}
}
