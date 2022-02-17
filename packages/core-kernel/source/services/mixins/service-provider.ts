import { Identifiers } from "../../ioc";
import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { MixinService } from "./mixins";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<MixinService>(Identifiers.MixinService).to(MixinService).inSingletonScope();
	}
}
