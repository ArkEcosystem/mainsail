import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class State implements Contracts.State.State {
	#isBootstrap = true;

	public isBootstrap(): boolean {
		return this.#isBootstrap;
	}

	public setBootstrap(value: boolean): void {
		this.#isBootstrap = value;
	}
}
