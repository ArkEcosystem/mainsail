import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

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

        if (commit.blockId !== block.header.id) {
            return false;
        }

        const publicKeys: Buffer[] = [];
        for (let i = 0; i < validators.length; i++) {
            if (!validators[i]) continue;

            const validatorPublicKey = this.validatorSet.getValidatorPublicKeyByIndex(i);
            publicKeys.push(Buffer.from(validatorPublicKey, "hex"));
        }

        if (!this.#isMajority(publicKeys.length)) {
            return false;
        }

        const commitMessage = await this.serializer.serializePrecommitForSignature({
            type: Contracts.Crypto.MessageType.Precommit,
            height,
            round,
            blockId: block.header.id,
        });

        const aggregatedPublicKey = await this.publicKeyFactory.aggregate(publicKeys);
        const verified = await this.signatureFactory.verify(
            Buffer.from(signature, "hex"),
            commitMessage,
            Buffer.from(aggregatedPublicKey, "hex")
        );

        if (!verified) {
            return false;
        }

        return true;
    }

    #isMajority(size: number): boolean {
        return size >= (this.configuration.getMilestone().activeValidators / 3) * 2 + 1;
    }
}
