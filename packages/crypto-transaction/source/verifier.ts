import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { InvalidLegacySecondSignatureError, MissingLegacySecondSignatureError } from "@mainsail/exceptions";

@injectable()
export class Verifier implements Contracts.Crypto.TransactionVerifier {
	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "wallet")
	private readonly signatureFactory!: Contracts.Crypto.SignatureEcdsa;

	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

	@inject(Identifiers.Cryptography.Transaction.HashFactory)
	private readonly hashFactory!: Contracts.Crypto.TransactionHashFactory;

	public async verifyHash(data: Contracts.Crypto.TransactionData): Promise<boolean> {
		const { r, s, senderPublicKey, v } = data;

		if (v === undefined || !r || !s || !senderPublicKey) {
			return false;
		}

		const hash: Buffer = await this.hashFactory.toHashUnsigned(data);
		return this.signatureFactory.verifyRecoverable({ r, s, v }, hash, Buffer.from(senderPublicKey, "hex"));
	}

	public async verifySchemaUnsigned(
		data: Contracts.Crypto.TransactionUnsignedSerializable,
	): Promise<Contracts.Crypto.SchemaValidationResult<Contracts.Crypto.TransactionUnsignedSerializable>> {
		return this.validator.validate("transaction", data);
	}

	public async verifySchemaSigned(
		data: Contracts.Crypto.TransactionSerializable,
	): Promise<Contracts.Crypto.SchemaValidationResult<Contracts.Crypto.TransactionSerializable>> {
		return this.validator.validate("transactionSigned", data);
	}

	public async verifySchemaStrict(
		data: Contracts.Crypto.TransactionData,
	): Promise<Contracts.Crypto.SchemaValidationResult<Contracts.Crypto.TransactionData>> {
		return this.validator.validate("transactionStrict", data);
	}

	public async verifyLegacySecondSignature(
		data: Contracts.Crypto.TransactionSerializable,
		legacySecondPublicKey: string,
	): Promise<boolean> {
		const { legacySecondSignature } = data;

		if (!legacySecondSignature) {
			throw new MissingLegacySecondSignatureError();
		}

		const r = legacySecondSignature.slice(0, 64);
		const s = legacySecondSignature.slice(64, 128);
		const v = Number.parseInt(legacySecondSignature.slice(128, 130), 16);

		const hash: Buffer = await this.hashFactory.toHashUnsigned(data);

		const verified = await this.signatureFactory.verifyRecoverable(
			{ r, s, v },
			hash,
			Buffer.from(legacySecondPublicKey, "hex"),
		);

		if (!verified) {
			throw new InvalidLegacySecondSignatureError();
		}

		return true;
	}
}
