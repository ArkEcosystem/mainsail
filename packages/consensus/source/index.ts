import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Broadcaster } from "./broadcaster";
import { Consensus } from "./consensus";
import { MessageFactory } from "./factory";
import { Handler } from "./handler";
import { RoundStateRepository } from "./round-state-repository";
import { Scheduler } from "./scheduler";
import { Serializer } from "./serializer";
import { Validator } from "./validator";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const keyPairFactory = this.app.get<Contracts.Crypto.IKeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPairFactory,
		);

		this.app.bind(Identifiers.Consensus.Serializer).to(Serializer).inSingletonScope();
		this.app.bind(Identifiers.Consensus.MessageFactory).to(MessageFactory).inSingletonScope();

		const keyPairs = await Promise.all(
			this.app.config("validators.secrets").map(async (menonic) => await keyPairFactory.fromMnemonic(menonic)),
		);
		const validators = keyPairs.map((keyPair) => this.app.resolve<Validator>(Validator).configure(keyPair));

		this.app.bind(Identifiers.Consensus.Handler).to(Handler).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Broadcaster).to(Broadcaster).inSingletonScope();
		this.app.bind(Identifiers.Consensus.RoundStateRepository).to(RoundStateRepository).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Scheduler).to(Scheduler).inSingletonScope();

		this.app.bind(Identifiers.Consensus.Service).toConstantValue(
			await this.app.resolve(Consensus).configure(
				validators.map((validator) => validator.getPublicKey()),
				validators,
			),
		);
	}

	public async boot(): Promise<void> {
		void this.app.get<Consensus>(Identifiers.Consensus.Service).run();
	}
}
