import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { formatEcdsaSignature } from "@mainsail/utils";

@injectable()
export class Signer implements Contracts.Crypto.TransactionSigner {
	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "wallet")
	private readonly signatureFactory!: Contracts.Crypto.SignatureEcdsa;

	@inject(Identifiers.Cryptography.Transaction.HashFactory)
	private readonly hashFactory!: Contracts.Crypto.TransactionHashFactory;

	public async sign(
		transaction: Contracts.Crypto.TransactionUnsignedSerializable,
		keys: Contracts.Crypto.KeyPair,
	): Promise<Contracts.Crypto.EcdsaSignature> {
		const hash: Buffer = await this.hashFactory.toHashUnsigned(transaction);
		return this.signatureFactory.signRecoverable(hash, Buffer.from(keys.privateKey, "hex"));
	}

	public async legacySecondSign(
		transaction: Contracts.Crypto.TransactionUnsignedSerializable,
		keys: Contracts.Crypto.KeyPair,
	): Promise<string> {
		const hash: Buffer = await this.hashFactory.toHashUnsigned(transaction);
		const { r, s, v } = await this.signatureFactory.signRecoverable(hash, Buffer.from(keys.privateKey, "hex"));

		return formatEcdsaSignature(r, s, v);
	}
}
