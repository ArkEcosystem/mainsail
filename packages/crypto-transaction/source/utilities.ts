import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";
import { encodeRlp, keccak256, toBeArray } from "ethers";

@injectable()
export class Utils implements Contracts.Crypto.TransactionUtilities {
	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.TransactionSerializer;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	public async toBytes(data: Contracts.Crypto.TransactionData): Promise<Buffer> {
		return this.serializer.serialize(this.transactionTypeFactory.create(data));
	}

	public async toHash(
		transaction: Contracts.Crypto.TransactionData,
		options?: Contracts.Crypto.SerializeOptions,
	): Promise<Buffer> {
		let fields: Array<any> = [];

		const { rlpPrefix } = transaction;

		// based on EIP1559 encoding
		if (rlpPrefix) {
			if (rlpPrefix !== 0x02) {
				throw new Error("expected EIP1559 transaction");
			}

			fields = [
				toBeArray(transaction.network),
				toBeArray(transaction.nonce.toBigInt()),
				toBeArray(0), // maxPriorityFeePerGas
				toBeArray(transaction.gasPrice), // maxFeePerGas
				toBeArray(transaction.gas),
				transaction.to || "0x",
				toBeArray(transaction.value.toBigInt()),
				transaction.data.startsWith("0x") ? transaction.data : `0x${transaction.data}`,
				[], // accessList is unused
			];
		} else {
			// Legacy encoding
			fields = [
				toBeArray(transaction.nonce.toBigInt()),
				toBeArray(transaction.gasPrice),
				toBeArray(transaction.gas),
				transaction.to || "0x",
				toBeArray(transaction.value.toBigInt()),
				transaction.data.startsWith("0x") ? transaction.data : `0x${transaction.data}`,

				// EIP-155 also requires chainId (`v`)
				toBeArray(transaction.network), // v
				toBeArray(0), // r
				toBeArray(0), // s
			];
		}

		if (options && !options.excludeSignature) {
			assert.number(transaction.v);
			assert.string(transaction.r);
			assert.string(transaction.s);

			if (rlpPrefix) {
				fields.push(toBeArray(transaction.v), `0x${transaction.r}`, `0x${transaction.s}`);
			} else {
				// Legacy with EIP-155
				const normalizedV = transaction.v;
				const v = transaction.network * 2 + 35 + normalizedV;

				fields[6] = toBeArray(v);
				fields[7] = `0x${transaction.r}`;
				fields[8] = `0x${transaction.s}`;
			}
		}

		let encoded = Buffer.from(encodeRlp(fields).slice(2), "hex");
		if (rlpPrefix) {
			encoded = Buffer.concat([Buffer.from([rlpPrefix]), encoded]);
		}

		return Buffer.from(keccak256(encoded).slice(2), "hex");
	}

	public async getHash(transaction: Contracts.Crypto.Transaction): Promise<string> {
		return (await this.toHash(transaction.data, { excludeSignature: false })).toString("hex");
	}
}
