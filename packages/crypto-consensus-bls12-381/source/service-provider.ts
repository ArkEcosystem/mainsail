import { Identifiers } from "@mainsail/constants";
import { injectable, Selectors } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";


@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Size)
			.toConstantValue(48)
			.when(Selectors.anyAncestorOrTargetTagged("type", "consensus"));

	}
}
