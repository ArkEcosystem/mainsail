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
			// toBeArray(transaction.data.network), // chainId - 0
			toBeArray(transaction.data.nonce.toBigInt()), // nonce - 1
			toBeArray(transaction.data.gasPrice), // maxFeePerGas - 2
			toBeArray(transaction.data.gasLimit), // gasLimit - 3
			transaction.data.to || "0x", // to - 4
			toBeArray(transaction.data.value.toBigInt()), // value - 5
			transaction.data.data.startsWith("0x") ? transaction.data.data : `0x${transaction.data.data}`, // data - 6
			// [], //accessList - 7
		];

		if (transaction.data.v !== undefined && transaction.data.r && transaction.data.s && !options.excludeSignature) {
			// 6, 7, 8
			fields.push(
				toBeArray(transaction.data.v + 10000 * 2 + 35),
				`0x${transaction.data.r}`,
				`0x${transaction.data.s}`,
			);

			if (transaction.data.legacySecondSignature) {
				// 10
				fields.push(`0x${transaction.data.legacySecondSignature}`);
			}
		}

		const rlpEncoded = encodeRlp(fields);

		// const eip2930Prefix = "01"; // marker for Type 1 (EIP2930)

		// transaction.serialized = Buffer.from(`${eip2930Prefix}${rlpEncoded.slice(2)}`, "hex");
		transaction.serialized = Buffer.from(`${rlpEncoded.slice(2)}`, "hex");

		return transaction.serialized;
	}
}
