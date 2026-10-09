import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

// 0x8f cannot start a transaction or signed-message preimage (0x00-0x7f, 0xc0-0xff)
const LEGACY_SECOND_SIGNATURE_DOMAIN = Buffer.concat([Buffer.from([0x8f]), Buffer.from("MAINSAIL_LSS_V1")]);

@injectable()
export class HashFactory implements Contracts.Crypto.TransactionHashFactory {
	@inject(Identifiers.Cryptography.Transaction.Serializer)
	private readonly serializer!: Contracts.Crypto.TransactionSerializer;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	public async toHash(transaction: Contracts.Crypto.TransactionSerializable): Promise<Buffer> {
		const serialized = await this.serializer.serialize({
			...transaction,
			legacySecondSignature: undefined, // excluded, the legacy second signature signs this hash
		});
		return this.hashFactory.keccak256(serialized);
	}

	public async toHashUnsigned(transaction: Contracts.Crypto.TransactionUnsignedSerializable): Promise<Buffer> {
		const serialized = await this.serializer.serializeUnsigned(transaction);
		return this.hashFactory.keccak256(serialized);
	}

	public toLegacySecondSignatureHash(transactionHash: Buffer): Buffer {
		return this.hashFactory.keccak256([LEGACY_SECOND_SIGNATURE_DOMAIN, transactionHash]);
	}
}
