import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class Deserializer implements Contracts.Crypto.CommitDeserializer {
	@inject(Identifiers.Cryptography.Serializer)
	private readonly serializer!: Contracts.Serializer.Serializer;

	@inject(Identifiers.Cryptography.Commit.Serializer)
	private readonly commitSerializer!: Contracts.Crypto.CommitSerializer;

	public async deserializeCommitProof(serialized: Buffer): Promise<Contracts.Crypto.CommitProof> {
		const buffer: ByteBuffer = ByteBuffer.fromBuffer(serialized);

		const proof = {} as Contracts.Crypto.CommitProof;

		await this.serializer.deserialize<Contracts.Crypto.CommitProof>(buffer, proof, {
			length: this.commitSerializer.proofSize(),
			schema: {
				round: {
					type: "uint32",
				},
				signature: {
					type: "consensusSignature",
				},
				validators: {
					type: "validatorSet",
				},
			},
		});

		return proof;
	}
}
