import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { numberToHex } from "@mainsail/utils";

@injectable()
export class Signer {
	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "wallet")
	private readonly signatureFactory!: Contracts.Crypto.Signature;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly utils!: Contracts.Crypto.TransactionUtils;

	public async sign(
		transaction: Contracts.Crypto.TransactionData,
		keys: Contracts.Crypto.KeyPair,
		options?: Contracts.Crypto.SerializeOptions,
	): Promise<string> {
		if (!options || options.excludeSignature === undefined) {
			options = { excludeSignature: true, ...options };
		}

		const hash: Buffer = await this.utils.toHash(transaction, options);
		const signature: string = await this.signatureFactory.sign(hash, Buffer.from(keys.privateKey, "hex"));

		if (!transaction.signature && !options.excludeMultiSignature) {
			transaction.signature = signature;
		}

		return signature;
	}

	public async multiSign(
		transaction: Contracts.Crypto.TransactionData,
		keys: Contracts.Crypto.KeyPair,
		index = -1,
	): Promise<string> {
		if (!transaction.signatures) {
			transaction.signatures = [];
		}

		index = index === -1 ? transaction.signatures.length : index;

		const hash: Buffer = await this.utils.toHash(transaction, {
			excludeMultiSignature: true,
			excludeSignature: true,
		});

		const signature: string = await this.signatureFactory.sign(hash, Buffer.from(keys.privateKey, "hex"));
		const indexedSignature = `${numberToHex(index)}${signature}`;
		transaction.signatures.push(indexedSignature);

		return indexedSignature;
	}
}
