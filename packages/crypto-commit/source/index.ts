import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { CommitFactory } from "./factory";
import { Serializer } from "./serializer";
import { Deserializer } from "./deserializer";

export class ServiceProvider extends Providers.ServiceProvider {
    public async register(): Promise<void> {
        this.app
            .bind(Identifiers.Cryptography.Commit.Serializer)
            .to(Serializer)
            .inSingletonScope();

        this.app
            .bind(Identifiers.Cryptography.Commit.Deserializer)
            .to(Deserializer)
            .inSingletonScope();

        this.app
            .bind(Identifiers.Cryptography.Commit.Factory)
            .to(CommitFactory)
            .inSingletonScope();
    }
}
