import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class Verifier implements Contracts.Crypto.TransactionVerifier {
	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "wallet")
	private readonly signatureFactory!: Contracts.Crypto.Signature;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly utils!: Contracts.Crypto.TransactionUtilities;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	public async verifyHash(data: Contracts.Crypto.TransactionData): Promise<boolean> {
		const { v, r, s, senderPublicKey } = data;

		if (v === undefined || !r || !s || !senderPublicKey) {
			return false;
		}

		const hash: Buffer = await this.utils.toHash(data, {
			excludeSignature: true,
		});

		return this.signatureFactory.verifyRecoverable({ r, s, v }, hash, Buffer.from(senderPublicKey, "hex"));
	}

	public async verifySchema(
		data: Contracts.Crypto.TransactionData,
		strict: boolean,
	): Promise<Contracts.Crypto.SchemaValidationResult> {
		const transactionType = this.transactionTypeFactory.get(0, 0, 0);

		if (!transactionType) {
			throw new Error("Unknown transaction type");
		}

		const { $id } = transactionType.getSchema();

		return this.validator.validate(strict ? `${$id}Strict` : `${$id}`, data);
	}

	public async verifyLegacySecondSignature(
		data: Contracts.Crypto.TransactionData,
		legacySecondPublicKey: string,
	): Promise<boolean> {
		const { legacySecondSignature } = data;

		if (!legacySecondSignature) {
			throw new Exceptions.MissingLegacySecondSignatureError();
		}

		const hash: Buffer = await this.utils.toHash(data, {
			excludeSignature: true,
		});

		if (
			!(await this.signatureFactory.verify(
				Buffer.from(legacySecondSignature, "hex"),
				hash,
				Buffer.from(legacySecondPublicKey, "hex"),
			))
		) {
			throw new Exceptions.InvalidLegacySecondSignatureError();
		}

		return true;
	}
}
