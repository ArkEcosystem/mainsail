import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { IPrecommitData, IPrevoteData, IProposalData, ISerializer, IVerificationResult, IVerifier } from "./types";

@injectable()
export class Verifier implements IVerifier {
	@inject(Identifiers.Consensus.Serializer)
	private readonly serializer: ISerializer;

	@inject(Identifiers.Consensus.Signature)
	private readonly signature: Contracts.Crypto.ISignature;

	public async verifyProposal(proposal: IProposalData): Promise<IVerificationResult> {
		const errors = [];

		const bytes = await this.serializer.serializeProposal(proposal, { excludeSignature: false });
		if (!this.#verifySignature(proposal.signature, proposal.validatorPublicKey, bytes)) {
			errors.push("invalid signature");
		}

		return {
			errors,
			verified: errors.length === 0,
		};
	}

	public async verifyPrevote(prevote: IPrevoteData): Promise<IVerificationResult> {
		const errors = [];

		const bytes = await this.serializer.serializePrevote(prevote, { excludeSignature: false });
		if (!this.#verifySignature(prevote.signature, prevote.validatorPublicKey, bytes)) {
			errors.push("invalid signature");
		}

		return {
			errors,
			verified: errors.length === 0,
		};
	}

	public async verifyPrecommit(precommit: IPrecommitData): Promise<IVerificationResult> {
		const errors = [];

		const bytes = await this.serializer.serializePrecommit(precommit, { excludeSignature: false });
		if (!this.#verifySignature(precommit.signature, precommit.validatorPublicKey, bytes)) {
			errors.push("invalid signature");
		}

		return {
			errors,
			verified: errors.length === 0,
		};
	}

	async #verifySignature(signature: string, validatorPublicKey: string, message: Buffer): Promise<boolean> {
		return this.signature.verify(Buffer.from(signature, "hex"), message, Buffer.from(validatorPublicKey, "hex"));
	}
}
