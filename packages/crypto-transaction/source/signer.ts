import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Signer implements Contracts.Crypto.TransactionSigner {
	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "wallet")
	private readonly signatureFactory!: Contracts.Crypto.Signature;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly utils!: Contracts.Crypto.TransactionUtilities;

	public async sign(
		transaction: Contracts.Crypto.TransactionData,
		keys: Contracts.Crypto.KeyPair,
		options?: Contracts.Crypto.SerializeOptions,
	): Promise<Contracts.Crypto.EcdsaSignature> {
		if (!options || options.excludeSignature === undefined) {
			options = { excludeSignature: true, ...options };
		}

		const hash: Buffer = await this.utils.toHash(transaction, options);
		const signature = await this.signatureFactory.signRecoverable(hash, Buffer.from(keys.privateKey, "hex"));

		transaction.v = signature.v;
		transaction.r = signature.r;
		transaction.s = signature.s;

		return signature;
	}

	public async legacySecondSign(
		transaction: Contracts.Crypto.TransactionData,
		keys: Contracts.Crypto.KeyPair,
		options?: Contracts.Crypto.SerializeOptions,
	): Promise<string> {
		if (!options || options.excludeSignature === undefined) {
			options = { excludeSignature: true, ...options };
		}

		const hash: Buffer = await this.utils.toHash(transaction, options);
		const signature = await this.signatureFactory.sign(hash, Buffer.from(keys.privateKey, "hex"));

		transaction.legacySecondSignature = signature;

		return signature;
	}
}
