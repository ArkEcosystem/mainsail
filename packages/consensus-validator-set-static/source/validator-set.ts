import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

@injectable()
export class ValidatorSet implements Contracts.Consensus.IValidatorSet {
    @inject(Identifiers.Application)
    private readonly app!: Contracts.Kernel.Application;

    @inject(Identifiers.WalletRepository)
    @tagged("state", "blockchain")
    private readonly walletRepository!: Contracts.State.WalletRepository;

    @inject(Identifiers.Cryptography.Identity.KeyPairFactory)
    private readonly walletKeyPairFactory!: Contracts.Crypto.IKeyPairFactory;

    // TODO: use PublicKeyFactory when possible
    @inject(Identifiers.Consensus.Identity.KeyPairFactory)
    private readonly consensusKeyPairFactory!: Contracts.Crypto.IKeyPairFactory;

    async getActiveValidators(): Promise<Contracts.State.Wallet[]> {
        const secrets = this.app
            .config<string[]>("validators.secrets");

        this.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes).set("consensus.publicKey");

        return await Promise.all(
            secrets.map(async (secret) => {
                const keyPair = await this.walletKeyPairFactory.fromMnemonic(secret);

                const wallet = await this.walletRepository.findByPublicKey(keyPair.publicKey);

                // TODO: shouldn't be an attribute
                wallet.setAttribute("consensus.publicKey", (await this.consensusKeyPairFactory.fromMnemonic(secret)).publicKey);

                return wallet;
            }),
        );
    }
}
