import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class CommitFactory implements Contracts.Crypto.CommitBlockFactory {
	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Commit.Serializer)
	private readonly commitSerializer!: Contracts.Crypto.CommitBlockSerializer;

	@inject(Identifiers.Cryptography.Commit.Deserializer)
	private readonly commitDeserializer!: Contracts.Crypto.CommitBlockDeserializer;

	public async fromBytes(buff: Buffer): Promise<Contracts.Crypto.CommittedBlock> {
		const buffer = ByteBuffer.fromBuffer(buff);

		const commitBuffer = buffer.readBytes(this.commitSerializer.commitSize());
		const commit = await this.commitDeserializer.deserializeCommit(commitBuffer);

		const block = await this.blockFactory.fromBytes(buffer.getRemainder());

		return {
			block,
			commit,
			serialized: buff.toString("hex"),
		};
	}

	public async fromJson(json: Contracts.Crypto.CommittedBlockJson): Promise<Contracts.Crypto.CommittedBlock> {
		const block = await this.blockFactory.fromJson(json.block);
		return {
			block,
			commit: json.commit,
			serialized: json.serialized,
		};
	}
}
