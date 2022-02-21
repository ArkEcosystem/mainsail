import { Container } from "@arkecosystem/container";
import { BINDINGS, Signatory } from "@arkecosystem/crypto-contracts";
import { Configuration } from "@arkecosystem/crypto-config";

import { DuplicateParticipantInMultiSignatureError, InvalidMultiSignatureAssetError } from "./errors";
import {
	IMultiSignatureAsset,
	ISchemaValidationResult,
	ITransactionData,
	IVerifyOptions,
} from "@arkecosystem/crypto-contracts";
import { TransactionTypeFactory } from "./types/factory";
import { Utils } from "./utils";

@Container.injectable()
export class Verifier {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: Configuration;

	@Container.inject(BINDINGS.SignatureFactory)
	private readonly signatureFactory: Signatory;

	@Container.inject(BINDINGS.Validator)
	private readonly validator: any;

	@Container.inject(BINDINGS.Transaction.Utils)
	private readonly utils: Utils;

	public async verify(data: ITransactionData, options?: IVerifyOptions): Promise<boolean> {
		if (this.configuration.getMilestone().aip11 && (!data.version || data.version === 1)) {
			return false;
		}

		return this.verifyHash(data, options?.disableVersionCheck);
	}

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
			for (let i = 0; i < signatures.length; i++) {
				const signature: string = signatures[i];
				const publicKeyIndex: number = parseInt(signature.slice(0, 2), 16);

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
				} else if (signatures.length - (i + 1 - verifiedSignatures) < min) {
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
		const transactionType = TransactionTypeFactory.get(data.type, data.typeGroup, data.version);

		if (!transactionType) {
			throw new Error();
		}

		const { $id } = transactionType.getSchema();

		return this.validator.validate(strict ? `${$id}Strict` : `${$id}`, data);
	}
}
