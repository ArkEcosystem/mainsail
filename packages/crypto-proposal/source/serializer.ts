import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { lockProofSchema, schema, schemaForSignature } from "./serializer-schemas.js";

@injectable()
export class Serializer implements Contracts.Crypto.ProposalSerializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Signature.Size)
	@tagged("type", "consensus")
	private readonly signatureSize!: number;

	@inject(Identifiers.Cryptography.Proposal.LockProofSize)
	private readonly lockProofSize!: () => number;

	public async serializeProposal(
		proposal: Contracts.Crypto.SerializableProposalData,
		options: Contracts.Crypto.SerializeProposalOptions,
	): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.SerializableProposalData>(proposal, {
			length:
				4 + // round
				(proposal.validRound === undefined ? 1 : 5) + // validRound
				4 + // serialized data length
				proposal.data.serialized.length / 2 + // serialized data
				1 + // validatorIndex
				(options.includeSignature ? this.signatureSize : 0), // signature
			schema: options.includeSignature ? schema : schemaForSignature,
			skip: 0,
		});
	}

	public async serializeLockProof(lockProof: Contracts.Crypto.AggregatedSignature): Promise<Buffer> {
		return this.serializer.serialize<Contracts.Crypto.AggregatedSignature>(lockProof, {
			length: this.lockProofSize(),
			schema: lockProofSchema,
			skip: 0,
		});
	}

	public async serializeProposed(proposedBlock: Contracts.Crypto.ProposedBlockSerializable): Promise<Buffer> {
		const serializedBlock = Buffer.from(proposedBlock.block.serialized, "hex");

		// NOTE: The lock proof is undefined most of the time, hence we can safe a lot of bytes
		// here by explicitly storing it's length instead of padding it with zero bytes.
		if (proposedBlock.lockProof) {
			const serializedLockProof = await this.serializeLockProof(proposedBlock.lockProof);
			const proofLength = Buffer.of(serializedLockProof.length);
			return Buffer.concat([proofLength, serializedLockProof, serializedBlock]);
		}

		return Buffer.concat([Buffer.of(0), serializedBlock]);
	}
}
