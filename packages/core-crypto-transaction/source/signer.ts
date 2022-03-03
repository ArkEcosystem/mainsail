import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { numberToHex } from "./helpers";

@injectable()
export class Signer {
	@inject(Identifiers.Cryptography.Signature)
	private readonly signatureFactory: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly utils: Contracts.Crypto.ITransactionUtils;

	public async sign(
		transaction: Contracts.Crypto.ITransactionData,
		keys: Contracts.Crypto.IKeyPair,
		options?: Contracts.Crypto.ISerializeOptions,
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
		transaction: Contracts.Crypto.ITransactionData,
		keys: Contracts.Crypto.IKeyPair,
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
