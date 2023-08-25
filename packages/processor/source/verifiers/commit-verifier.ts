import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class CommitVerifier implements Contracts.BlockProcessor.Handler {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Identity.PublicKeyFactory)
	@tagged("type", "consensus")
	private readonly publicKeyFactory!: Contracts.Crypto.IPublicKeyFactory;

	@inject(Identifiers.Cryptography.Signature)
	@tagged("type", "consensus")
	private readonly signatureFactory!: Contracts.Crypto.ISignature;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.IMessageSerializer;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	public async execute(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		const { block, commit } = await unit.getProposedCommitBlock();
		const { height, round, validators, signature } = commit;

		if (commit.height !== block.header.height) {
			return false;
		}

		// if (commit.blockId !== block.header.id) {
		// 	return false;
		// }

		const publicKeys: Buffer[] = [];
		for (const [index, validator] of validators.entries()) {
			if (!validator) {
				continue;
			}

			const validatorPublicKey = this.validatorSet.getValidator(index).getConsensusPublicKey();
			publicKeys.push(Buffer.from(validatorPublicKey, "hex"));
		}

		if (!Utils.isMajority(publicKeys.length, this.configuration)) {
			return false;
		}

		const commitMessage = await this.serializer.serializePrecommitForSignature({
			blockId: block.header.id,
			height,
			round,
			type: Contracts.Crypto.MessageType.Precommit,
		});

		const aggregatedPublicKey = await this.publicKeyFactory.aggregate(publicKeys);
		const verified = await this.signatureFactory.verify(
			Buffer.from(signature, "hex"),
			commitMessage,
			Buffer.from(aggregatedPublicKey, "hex"),
		);

		if (!verified) {
			return false;
		}

		return true;
	}
}
