import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Validator } from "./validator";
import { ValidatorRepository } from "./validator-repository";

export class ServiceProvider extends Providers.ServiceProvider {
    public async register(): Promise<void> {
        const walletPublicKeyFactory = this.app.getTagged<Contracts.Crypto.IPublicKeyFactory>(
            Identifiers.Cryptography.Identity.PublicKeyFactory,
            "type",
            "wallet",
        );

        const consensusKeyPairFactory = this.app.getTagged<Contracts.Crypto.IKeyPairFactory>(
            Identifiers.Cryptography.Identity.KeyPairFactory,
            "type",
            "consensus",
        );

        const validators: Contracts.Consensus.IValidator[] = [];
        for (const mnemonic of this.app.config("validators.secrets")) {
            const consensusKeyPair = await consensusKeyPairFactory.fromMnemonic(mnemonic);
            const walletPublicKey = await walletPublicKeyFactory.fromMnemonic(mnemonic);

            validators.push(this.app.resolve<Contracts.Consensus.IValidator>(Validator).configure(walletPublicKey, consensusKeyPair));
        }

        this.app
            .bind(Identifiers.Consensus.ValidatorRepository)
            .toConstantValue(this.app.resolve(ValidatorRepository).configure(validators));
    }
}
