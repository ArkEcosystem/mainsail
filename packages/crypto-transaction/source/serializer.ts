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
			toBeArray(transaction.data.nonce.toBigInt()), // nonce - 0
			toBeArray(transaction.data.gasPrice), // maxFeePerGas - 1
			toBeArray(transaction.data.gasLimit), // gasLimit - 2
			transaction.data.to || "0x", // to - 3
			toBeArray(transaction.data.value.toBigInt()), // value - 4
			transaction.data.data.startsWith("0x") ? transaction.data.data : `0x${transaction.data.data}`, // data - 5
		];

		if (transaction.data.v !== undefined && transaction.data.r && transaction.data.s && !options.excludeSignature) {
			// 6, 7, 8
			fields.push(
				toBeArray(transaction.data.v + 10000 * 2 + 35),
				`0x${transaction.data.r}`,
				`0x${transaction.data.s}`,
			);

			if (transaction.data.legacySecondSignature) {
				// 9
				fields.push(`0x${transaction.data.legacySecondSignature}`);
			}
		}

		const rlpEncoded = encodeRlp(fields);
		transaction.serialized = Buffer.from(`${rlpEncoded.slice(2)}`, "hex");

		return transaction.serialized;
	}
}
