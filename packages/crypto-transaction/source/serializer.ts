import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { encodeRlp, toBeArray } from "ethers";

@injectable()
export class Serializer implements Contracts.Crypto.TransactionSerializer {
	public async serialize(
		transaction: Contracts.Crypto.Transaction,
		options: Contracts.Crypto.SerializeOptions = {},
	): Promise<Buffer> {
		let fields: Array<any> = [];

		const { rlpPrefix } = transaction.data;

		if (rlpPrefix) {
			if (rlpPrefix !== 0x02) {
				throw new Error("expected EIP1559 transaction");
			}

			fields = [
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
		} else {
			// Legacy encoding
			fields = [
				toBeArray(transaction.data.nonce.toBigInt()),
				toBeArray(transaction.data.gasPrice),
				toBeArray(transaction.data.gas),
				transaction.data.to || "0x",
				toBeArray(transaction.data.value.toBigInt()),
				transaction.data.data.startsWith("0x") ? transaction.data.data : `0x${transaction.data.data}`,

				// EIP-155 also requires chainId (`v`)
				toBeArray(transaction.data.network), // v
				toBeArray(0), // r
				toBeArray(0), // s
			];
		}

		if (transaction.data.v !== undefined && transaction.data.r && transaction.data.s && !options.excludeSignature) {
			if (rlpPrefix) {
				// 9, 10, 11
				fields.push(toBeArray(transaction.data.v), `0x${transaction.data.r}`, `0x${transaction.data.s}`);

				if (transaction.data.legacySecondSignature) {
					// 12
					fields.push(`0x${transaction.data.legacySecondSignature}`);
				}
			} else {
				// Legacy with EIP-155
				const normalizedV = transaction.data.v;
				const v = transaction.data.network * 2 + 35 + normalizedV;

				fields[6] = toBeArray(v);
				fields[7] = `0x${transaction.data.r}`;
				fields[8] = `0x${transaction.data.s}`;
			}
		}

		let encoded = Buffer.from(encodeRlp(fields).slice(2), "hex");
		if (rlpPrefix) {
			encoded = Buffer.concat([Buffer.from([rlpPrefix]), encoded]);
		}

		transaction.serialized = encoded;

		return transaction.serialized;
	}
}
