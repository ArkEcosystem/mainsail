import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";
import { encodeRlp, toBeArray } from "ethers";

@injectable()
export class Utils implements Contracts.Crypto.TransactionUtils {
	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.TransactionSerializer;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

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
			toBeArray(transaction.gasPrice), // maxPriorityFeePerGas
			toBeArray(transaction.gasPrice), // maxFeePerGas
			toBeArray(transaction.gasLimit),
			transaction.recipientAddress || "0x",
			toBeArray(transaction.value.toBigInt()),
			transaction.data.startsWith("0x") ? transaction.data : `0x${transaction.data}`,
			[], // accessList is unused
		];

		if (options && !options.excludeSignature) {
			AppUtils.assert.defined<string>(transaction.signature);
			const signatureBuffer = Buffer.from(transaction.signature, "hex");

			const r = signatureBuffer.subarray(0, 32);
			const s = signatureBuffer.subarray(32, 64);
			const v = signatureBuffer.readUint8(64);

			fields.push(toBeArray(v), r, s);
		}

		const eip1559Prefix = "02"; // marker for Type 2 (EIP1559) transaction which is the standard nowadays
		const encoded = encodeRlp(fields).slice(2); // remove 0x prefix
		return this.hashFactory.sha256(Buffer.from(`${eip1559Prefix}${encoded}`, "hex"));
	}

	public async getId(transaction: Contracts.Crypto.Transaction): Promise<string> {
		return (await this.toHash(transaction.data, { excludeSignature: false })).toString("hex");
	}
}
