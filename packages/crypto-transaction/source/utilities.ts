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
		// based on EIP1559 encoding
		const fields = [
			toBeArray(transaction.network),
			toBeArray(transaction.nonce.toBigInt()),
			toBeArray(0), // maxPriorityFeePerGas
			toBeArray(transaction.gasPrice), // maxFeePerGas
			toBeArray(transaction.gasLimit),
			transaction.recipientAddress || "0x",
			toBeArray(transaction.value.toBigInt()),
			transaction.data.startsWith("0x") ? transaction.data : `0x${transaction.data}`,
			[], // accessList is unused
		];

		if (options && !options.excludeSignature) {
			assert.number(transaction.v);
			assert.string(transaction.r);
			assert.string(transaction.s);

			fields.push(toBeArray(transaction.v), `0x${transaction.r}`, `0x${transaction.s}`);
		}

		const eip1559Prefix = "02"; // marker for Type 2 (EIP1559) transaction which is the standard nowadays
		const encoded = encodeRlp(fields).slice(2); // remove 0x prefix

		return Buffer.from(keccak256(Buffer.from(`${eip1559Prefix}${encoded}`, "hex")).slice(2), "hex");
	}

	public async getId(transaction: Contracts.Crypto.Transaction): Promise<string> {
		return (await this.toHash(transaction.data, { excludeSignature: false })).toString("hex");
	}
}
