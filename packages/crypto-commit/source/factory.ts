import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class CommitFactory implements Contracts.Crypto.CommitFactory {
	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Commit.Serializer)
	private readonly commitSerializer!: Contracts.Crypto.CommitSerializer;

	@inject(Identifiers.Cryptography.Commit.Deserializer)
	private readonly commitDeserializer!: Contracts.Crypto.CommitDeserializer;

	public async fromBytes(buff: Buffer): Promise<Contracts.Crypto.Commit> {
		const buffer = ByteBuffer.fromBuffer(buff);

		const proofBuffer = buffer.readBytes(this.commitSerializer.proofSize());
		const proof = await this.commitDeserializer.deserializeCommitProof(proofBuffer);

		const block = await this.blockFactory.fromBytes(buffer.getRemainder());

		return {
			block,
			proof,
			serialized: buff.toString("hex"),
		};
	}

	public async fromJson(json: Contracts.Crypto.CommitJson): Promise<Contracts.Crypto.Commit> {
		const block = await this.blockFactory.fromJson(json.block);
		return {
			block,
			proof: json.proof,
			serialized: json.serialized,
		};
	}
}
