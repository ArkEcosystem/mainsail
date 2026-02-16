import { Identifiers } from "@mainsail/constants";
import { inject,injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class HashFactory implements Contracts.Crypto.TransactionHashFactory {
	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.TransactionSerializer;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	public async toHash(transaction: Contracts.Crypto.TransactionSerializable): Promise<Buffer> {
		const serialized = await this.serializer.serialize({
			...transaction,
			legacySecondSignature: undefined // TODO: Decide if legacySecondSignature should be part of the hash or not. For now, we exclude it to maintain compatibility with existing hashes.
		});
		return this.hashFactory.keccak256(serialized);
	}

	public async toHashUnsigned(transaction: Contracts.Crypto.TransactionUnsignedSerializable): Promise<Buffer> {
		const serialized = await this.serializer.serializeUnsigned(transaction);
		return this.hashFactory.keccak256(serialized);
	}
}
