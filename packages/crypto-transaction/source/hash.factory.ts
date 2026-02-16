import { Identifiers } from "@mainsail/constants";
import { inject,injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Keccak256 } from "bcrypto";

@injectable()
export class HashFactory implements Contracts.Crypto.TransactionHashFactory {
	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.TransactionSerializer;

	public async toHash(transaction: Contracts.Crypto.TransactionSerializable): Promise<Buffer> {
		const serialized = await this.serializer.serialize({
			...transaction,
			legacySecondSignature: undefined // TODO: Decide if legacySecondSignature should be part of the hash or not. For now, we exclude it to maintain compatibility with existing hashes.
		});
		return Buffer.from(Keccak256.digest(serialized));
	}

	public async toHashUnsigned(transaction: Contracts.Crypto.TransactionUnsignedSerializable): Promise<Buffer> {
		const serialized = await this.serializer.serializeUnsigned(transaction);
		return Buffer.from(Keccak256.digest(serialized));
	}
}
