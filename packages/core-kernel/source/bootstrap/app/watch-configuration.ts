import { Application } from "../../contracts/kernel";
import { Identifiers, inject, injectable } from "../../ioc";
import { Watcher } from "../../services/config/watcher";
import { Bootstrapper } from "../interfaces";

@injectable()
export class WatchConfiguration implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Application;

	public async bootstrap(): Promise<void> {
		await this.app.resolve<Watcher>(Watcher).boot();
	}
}
