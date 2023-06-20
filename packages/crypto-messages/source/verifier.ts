import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Verifier implements Contracts.Crypto.IMessageVerifier {
	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.IMessageSerializer;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signature!: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Identity.PublicKeyFactory)
	@tagged("type", "consensus")
	private readonly publicKeyFactory!: Contracts.Crypto.IPublicKeyFactory;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	public async verifyProposal(
		proposal: Contracts.Crypto.IProposal,
	): Promise<Contracts.Crypto.IMessageVerificationResult> {
		const errors: string[] = [];

		const bytes = await this.serializer.serializeProposalForSignature(proposal.toSignatureData());
		if (!(await this.#verifySignature(proposal.signature, proposal.validatorIndex, bytes))) {
			errors.push("invalid signature");
		}

		return {
			errors,
			verified: errors.length === 0,
		};
	}

	public async verifyPrevote(
		prevote: Contracts.Crypto.IPrevote,
	): Promise<Contracts.Crypto.IMessageVerificationResult> {
		const errors: string[] = [];

		const bytes = await this.serializer.serializePrevoteForSignature(prevote.toSignatureData());
		if (!(await this.#verifySignature(prevote.signature, prevote.validatorIndex, bytes))) {
			errors.push("invalid signature");
		}

		return {
			errors,
			verified: errors.length === 0,
		};
	}

	public async verifyPrecommit(
		precommit: Contracts.Crypto.IPrecommit,
	): Promise<Contracts.Crypto.IMessageVerificationResult> {
		const errors: string[] = [];

		const bytes = await this.serializer.serializePrecommitForSignature(precommit.toSignatureData());
		if (!(await this.#verifySignature(precommit.signature, precommit.validatorIndex, bytes))) {
			errors.push("invalid signature");
		}

		return {
			errors,
			verified: errors.length === 0,
		};
	}

	public async verifyProposalLockProof(
		prevote: Contracts.Crypto.ISignaturePrevoteData,
		lockProof: Contracts.Crypto.IProposalLockProof,
	): Promise<Contracts.Crypto.IMessageVerificationResult> {
		const errors: string[] = [];

		const bytes = await this.serializer.serializePrevoteForSignature(prevote);
		if (!(await this.#verifyAggSignature(lockProof.signature, lockProof.validators, bytes))) {
			errors.push("invalid signature");
		}

		return {
			errors,
			verified: errors.length === 0,
		};
	}

	async #verifySignature(signature: string, validatorIndex: number, message: Buffer): Promise<boolean> {
		const activeValidators = await this.validatorSet.getActiveValidators();

		const validator = activeValidators[validatorIndex];
		Utils.assert.defined<Contracts.State.Wallet>(validator);

		const validatorPublicKey = validator.getAttribute("consensus.publicKey");
		Utils.assert.defined<string>(validatorPublicKey);

		return this.signature.verify(Buffer.from(signature, "hex"), message, Buffer.from(validatorPublicKey, "hex"));
	}

	async #verifyAggSignature(signature: string, validators: boolean[], message: Buffer): Promise<boolean> {
		// TODO: take round / height into account
		const activeValidators = await this.validatorSet.getActiveValidators();

		const validatorPublicKeys = validators
			.map((v, index) =>
				v ? Buffer.from(activeValidators[index].getAttribute<string>("consensus.publicKey"), "hex") : undefined,
			)
			.filter((v) => v !== undefined) as Buffer[];

		const aggregatedPublicKey = await this.publicKeyFactory.aggregate(validatorPublicKeys);

		return this.signature.verify(Buffer.from(signature, "hex"), message, Buffer.from(aggregatedPublicKey, "hex"));
	}
}
