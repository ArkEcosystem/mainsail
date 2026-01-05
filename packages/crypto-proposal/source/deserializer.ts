import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

import { lockProofSchema, schema } from "./serializer-schemas.js";

@injectable()
export class Deserializer implements Contracts.Crypto.ProposalDeserializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Proposal.LockProofSize)
	private readonly lockProofSize!: () => number;

	public async deserializeProposal(serialized: Buffer): Promise<Contracts.Crypto.ProposalData> {
		const proposal = {} as Contracts.Crypto.ProposalData;

		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		await this.serializer.deserialize<Contracts.Crypto.ProposalData>(buffer, proposal, {
			schema,
		});

		return proposal;
	}

	public async deserializeLockProof(serialized: Buffer): Promise<Contracts.Crypto.AggregatedSignature> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const commit = {} as Contracts.Crypto.AggregatedSignature;

		await this.serializer.deserialize<Contracts.Crypto.AggregatedSignature>(buffer, commit, {
			length: this.lockProofSize(),
			schema: lockProofSchema,
		});

		return commit;
	}
}
