import { Providers } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/contracts";
import { Serializer } from "./serializer";
import { MessageFactory } from "./factory";
import { Verifier } from "./verifier";

export class ServiceProvider extends Providers.ServiceProvider {

    public async register(): Promise<void> {
        this.app.bind(Identifiers.Cryptography.Message.Serializer).to(Serializer).inSingletonScope();
        this.app.bind(Identifiers.Cryptography.Message.Deserializer).to(Serializer).inSingletonScope();
        this.app.bind(Identifiers.Cryptography.Message.Verifier).to(Verifier).inSingletonScope();
        this.app.bind(Identifiers.Cryptography.Message.Factory).to(MessageFactory).inSingletonScope();
    }

}
