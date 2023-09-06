import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import dayjs from "dayjs";

@injectable()
export class State implements Contracts.P2P.State {
	#lastMessage: dayjs.Dayjs = dayjs();

	public resetLastMessageTime(): void {
		this.#lastMessage = dayjs();
	}

	public getLastMessageTime(): dayjs.Dayjs {
		return this.#lastMessage;
	}
}
