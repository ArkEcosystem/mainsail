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

		const r = legacySecondSignature.slice(0, 64);
		const s = legacySecondSignature.slice(64, 128);
		const v = Number.parseInt(legacySecondSignature.slice(128, 130), 16);

		const hash: Buffer = await this.utils.toHash(data, {
			excludeSignature: true,
		});

		const verified = await this.signatureFactory.verifyRecoverable(
			{ r, s, v },
			hash,
			Buffer.from(legacySecondPublicKey, "hex"),
		);

		if (!verified) {
			throw new Exceptions.InvalidLegacySecondSignatureError();
		}

		return true;
	}
}
