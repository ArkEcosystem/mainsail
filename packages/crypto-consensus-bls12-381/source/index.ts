import { Providers } from "@mainsail/kernel";
import { Selectors } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { KeyPairFactory, PublicKeyFactory, PrivateKeyFactory, PublicKeySerializer } from "@mainsail/crypto-key-pair-bls12-381";
import { Signature } from "@mainsail/crypto-signature-bls12-381";

export class ServiceProvider extends Providers.ServiceProvider {
    public async register(): Promise<void> {
        this.app.bind(Identifiers.Cryptography.Size.PublicKey).toConstantValue(48)
            .when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

        this.app.bind(Identifiers.Cryptography.Size.Signature).toConstantValue(96)
            .when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

        this.app
            .bind(Identifiers.Cryptography.Identity.KeyPairFactory)
            .to(KeyPairFactory)
            .inSingletonScope()
            .when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

        this.app
            .bind(Identifiers.Cryptography.Identity.PrivateKeyFactory)
            .to(PrivateKeyFactory)
            .inSingletonScope()
            .when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

        this.app
            .bind(Identifiers.Cryptography.Identity.PublicKeyFactory)
            .to(PublicKeyFactory)
            .inSingletonScope()
            .when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

        this.app
            .bind(Identifiers.Cryptography.Identity.PublicKeySerializer)
            .to(PublicKeySerializer)
            .inSingletonScope()
            .when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

        this.app.bind(Identifiers.Cryptography.Signature).to(Signature).inSingletonScope()
            .when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

        // TODO: register schema
        // for (const schema of Object.values(schemas)) {
        //     this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addSchema(schema);
        // }
    }
}
