import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Broadcaster } from "./broadcaster";
import { Consensus } from "./consensus";
import { Handler } from "./handler";
import { RoundStateRepository } from "./round-state-repository";
import { Scheduler } from "./scheduler";
import { Validator } from "./validator";
import { ValidatorRepository } from "./validator-repository";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Consensus.Handler).to(Handler).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Broadcaster).to(Broadcaster).inSingletonScope();
		this.app.bind(Identifiers.Consensus.RoundStateRepository).to(RoundStateRepository).inSingletonScope();
		this.app.bind(Identifiers.Consensus.Scheduler).to(Scheduler).inSingletonScope();

		// TODO: these are validators running on "this" node
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

		const validators: Validator[] = [];
		for (const mnemonic of this.app.config("validators.secrets")) {
			const consensusKeyPair = await consensusKeyPairFactory.fromMnemonic(mnemonic);
			const walletPublicKey = await walletPublicKeyFactory.fromMnemonic(mnemonic);

			validators.push(this.app.resolve<Validator>(Validator).configure(walletPublicKey, consensusKeyPair));
		}

		this.app
			.bind(Identifiers.Consensus.ValidatorRepository)
			.toConstantValue(this.app.resolve(ValidatorRepository).configure(validators));

		this.app.bind(Identifiers.Consensus.Service).toConstantValue(this.app.resolve(Consensus));
	}
}
