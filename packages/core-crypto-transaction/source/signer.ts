import { Container } from "@arkecosystem/core-container";
import {
	BINDINGS,
	IKeyPair,
	ISerializeOptions,
	ITransactionData,
	ITransactionUtils,
	ISignature,
} from "@arkecosystem/core-crypto-contracts";

import { numberToHex } from "./helpers";

@Container.injectable()
export class Signer {
	@Container.inject(BINDINGS.Signature)
	private readonly signatureFactory: ISignature;

	@Container.inject(BINDINGS.Transaction.Utils)
	private readonly utils: ITransactionUtils;

	public async sign(transaction: ITransactionData, keys: IKeyPair, options?: ISerializeOptions): Promise<string> {
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

	public async multiSign(transaction: ITransactionData, keys: IKeyPair, index = -1): Promise<string> {
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
