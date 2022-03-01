import { Container } from "@arkecosystem/core-container";
import {
	BINDINGS,
	IMultiSignatureAsset,
	ISchemaValidationResult,
	ITransactionData,
	ITransactionUtils,
	ITransactionVerifier,
	ISignature,
} from "@arkecosystem/core-crypto-contracts";
import { Contracts } from "@arkecosystem/core-kernel";

import { DuplicateParticipantInMultiSignatureError, InvalidMultiSignatureAssetError } from "./errors";

@Container.injectable()
export class Verifier implements ITransactionVerifier {
	@Container.inject(BINDINGS.Signature)
	private readonly signatureFactory: ISignature;

	@Container.inject(BINDINGS.Validator)
	private readonly validator: any;

	@Container.inject(BINDINGS.Transaction.Utils)
	private readonly utils: ITransactionUtils;

	@Container.inject(BINDINGS.Transaction.TypeFactory)
	private readonly transactionTypeFactory: Contracts.Transactions.ITransactionTypeFactory;

	public async verifySignatures(
		transaction: ITransactionData,
		multiSignature: IMultiSignatureAsset,
	): Promise<boolean> {
		if (!multiSignature) {
			throw new InvalidMultiSignatureAssetError();
		}

		const { publicKeys, min }: IMultiSignatureAsset = multiSignature;
		const { signatures }: ITransactionData = transaction;

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
					throw new DuplicateParticipantInMultiSignatureError();
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

	public async verifyHash(data: ITransactionData, disableVersionCheck = false): Promise<boolean> {
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

	public verifySchema(data: ITransactionData, strict = true): ISchemaValidationResult {
		const transactionType = this.transactionTypeFactory.get(data.type, data.typeGroup, data.version);

		if (!transactionType) {
			throw new Error();
		}

		const { $id } = transactionType.getSchema();

		return this.validator.validate(strict ? `${$id}Strict` : `${$id}`, data);
	}
}
