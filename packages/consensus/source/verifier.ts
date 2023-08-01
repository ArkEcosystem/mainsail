import {
    inject, injectable
} from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Verifier implements Contracts.Consensus.IVerifier {

    @inject(Identifiers.Cryptography.Message.Verifier)
    private readonly verifier!: Contracts.Crypto.IMessageVerifier;

    public async hasValidProposalLockProof(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
        const proposal = roundState.getProposal();
        const lockProof = proposal?.block?.lockProof;
        if (!lockProof) {
            return false;
        }

        Utils.assert.defined<Contracts.Crypto.IProposal>(proposal);

        const { verified } = await this.verifier.verifyProposalLockProof(
            {
                blockId: proposal.block.block.header.id,
                height: proposal.height,
                round: proposal.round,
                type: Contracts.Crypto.MessageType.Prevote,
            },
            lockProof,
        );

        return verified;
    }

}
