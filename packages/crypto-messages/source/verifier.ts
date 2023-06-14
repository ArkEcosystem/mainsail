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

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	public async verifyProposal(
		proposal: Contracts.Crypto.IProposalData,
	): Promise<Contracts.Crypto.IMessageVerificationResult> {
		const errors: string[] = [];

		const bytes = await this.serializer.serializeProposal(proposal, { excludeSignature: true });
		if (!(await this.#verifySignature(proposal.signature, proposal.validatorIndex, bytes))) {
			errors.push("invalid signature");
		}

		return {
			errors,
			verified: errors.length === 0,
		};
	}

	public async verifyPrevote(
		prevote: Contracts.Crypto.IPrevoteData,
	): Promise<Contracts.Crypto.IMessageVerificationResult> {
		const errors: string[] = [];

		const bytes = await this.serializer.serializePrevote(prevote, { excludeSignature: true });
		if (!(await this.#verifySignature(prevote.signature, prevote.validatorIndex, bytes))) {
			errors.push("invalid signature");
		}

		return {
			errors,
			verified: errors.length === 0,
		};
	}

	public async verifyPrecommit(
		precommit: Contracts.Crypto.IPrecommitData,
	): Promise<Contracts.Crypto.IMessageVerificationResult> {
		const errors: string[] = [];

		const bytes = await this.serializer.serializePrecommit(precommit, { excludeSignature: true });
		if (!(await this.#verifySignature(precommit.signature, precommit.validatorIndex, bytes))) {
			errors.push("invalid signature");
		}

		return {
			errors,
			verified: errors.length === 0,
		};
	}

	async #verifySignature(signature: string, validatorIndex: number, message: Buffer): Promise<boolean> {
		// TODO: take round / height into account
		const activeValidators = await this.validatorSet.getActiveValidators();

		const validator = activeValidators[validatorIndex];
		Utils.assert.defined<Contracts.State.Wallet>(validator);

		const validatorPublicKey = validator.getAttribute("consensus.publicKey");
		Utils.assert.defined<string>(validatorPublicKey);

		return this.signature.verify(Buffer.from(signature, "hex"), message, Buffer.from(validatorPublicKey, "hex"));
	}
}
