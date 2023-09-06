import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import dayjs from "dayjs";

@injectable()
export class State implements Contracts.P2P.State {
	#lastMessage: dayjs.Dayjs = dayjs();

	public updateLastMessage(): void {
		this.#lastMessage = dayjs();
	}

	public shouldCleansePeers(): boolean {
		return dayjs().diff(this.#lastMessage, "second") >= 20;
	}
}
