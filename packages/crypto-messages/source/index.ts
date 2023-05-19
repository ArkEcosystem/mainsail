import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Deserializer } from "./deserializer";
import { MessageFactory } from "./factory";
import { Serializer } from "./serializer";
import { Verifier } from "./verifier";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Message.Serializer).to(Serializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Message.Deserializer).to(Deserializer).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Message.Verifier).to(Verifier).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Message.Factory).to(MessageFactory).inSingletonScope();
	}
}
