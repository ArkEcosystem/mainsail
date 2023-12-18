import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class Verifier implements Contracts.Crypto.TransactionVerifier {
	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "wallet")
	private readonly signatureFactory!: Contracts.Crypto.Signature;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly utils!: Contracts.Crypto.TransactionUtils;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	public async verifySignatures(
		transaction: Contracts.Crypto.TransactionData,
		multiSignature: Contracts.Crypto.MultiSignatureAsset,
	): Promise<boolean> {
		if (!multiSignature) {
			throw new Exceptions.InvalidMultiSignatureAssetError();
		}

		const { publicKeys, min }: Contracts.Crypto.MultiSignatureAsset = multiSignature;
		const { signatures }: Contracts.Crypto.TransactionData = transaction;

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
					await this.signatureFactory.verify(
						Buffer.from(partialSignature, "hex"),
						hash,
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

	public async verifyHash(data: Contracts.Crypto.TransactionData): Promise<boolean> {
		const { signature, senderPublicKey } = data;

		if (!signature || !senderPublicKey) {
			return false;
		}

		const hash: Buffer = await this.utils.toHash(data, {
			excludeSignature: true,
		});

		return this.signatureFactory.verify(Buffer.from(signature, "hex"), hash, Buffer.from(senderPublicKey, "hex"));
	}

	public async verifySchema(
		data: Contracts.Crypto.TransactionData,
		strict: boolean,
	): Promise<Contracts.Crypto.SchemaValidationResult> {
		const transactionType = this.transactionTypeFactory.get(data.type, data.typeGroup, data.version);

		if (!transactionType) {
			throw new Error("Unknown transaction type");
		}

		const { $id } = transactionType.getSchema();

		return this.validator.validate(strict ? `${$id}Strict` : `${$id}`, data);
	}
}
