import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Exceptions } from "@arkecosystem/core-contracts";

@injectable()
export class Verifier implements Contracts.Crypto.ITransactionVerifier {
	@inject(Identifiers.Cryptography.Signature)
	private readonly signatureFactory: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator: any;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly utils: Contracts.Crypto.ITransactionUtils;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory: Contracts.Transactions.ITransactionTypeFactory;

	public async verifySignatures(
		transaction: Contracts.Crypto.ITransactionData,
		multiSignature: Contracts.Crypto.IMultiSignatureAsset,
	): Promise<boolean> {
		if (!multiSignature) {
			throw new Exceptions.InvalidMultiSignatureAssetError();
		}

		const { publicKeys, min }: Contracts.Crypto.IMultiSignatureAsset = multiSignature;
		const { signatures }: Contracts.Crypto.ITransactionData = transaction;

		const hash: Buffer = await this.utils.toHash(transaction, {
			excludeMultiSignature: true,
			excludeSignature: true,
		});

		const publicKeyIndexes: { [index: number]: boolean } = {};
		let verified = false;
		let verifiedSignatures = 0;

		if (signatures) {
			for (let index = 0; index < signatures.length; index++) {
				const signature: string = signatures[index];
				const publicKeyIndex: number = Number.parseInt(signature.slice(0, 2), 16);

				if (!publicKeyIndexes[publicKeyIndex]) {
					publicKeyIndexes[publicKeyIndex] = true;
				} else {
					throw new Exceptions.DuplicateParticipantInMultiSignatureError();
				}

				const partialSignature: string = signature.slice(2, 130);
				const publicKey: string = publicKeys[publicKeyIndex];

				if (
					this.signatureFactory.verify(
						hash,
						Buffer.from(partialSignature, "hex"),
						Buffer.from(publicKey, "hex"),
					)
				) {
					verifiedSignatures++;
				}

				if (verifiedSignatures === min) {
					verified = true;
					break;
				} else if (signatures.length - (index + 1 - verifiedSignatures) < min) {
					break;
				}
			}
		}

		return verified;
	}

	public async verifyHash(data: Contracts.Crypto.ITransactionData, disableVersionCheck = false): Promise<boolean> {
		const { signature, senderPublicKey } = data;

		if (!signature || !senderPublicKey) {
			return false;
		}

		const hash: Buffer = await this.utils.toHash(data, {
			disableVersionCheck,
			excludeSignature: true,
		});

		return this.signatureFactory.verify(hash, Buffer.from(signature, "hex"), Buffer.from(senderPublicKey, "hex"));
	}

	public verifySchema(
		data: Contracts.Crypto.ITransactionData,
		strict: boolean,
	): Contracts.Crypto.ISchemaValidationResult {
		const transactionType = this.transactionTypeFactory.get(data.type, data.typeGroup, data.version);

		if (!transactionType) {
			throw new Error();
		}

		const { $id } = transactionType.getSchema();

		return this.validator.validate(strict ? `${$id}Strict` : `${$id}`, data);
	}
}
