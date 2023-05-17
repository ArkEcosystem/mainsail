import { injectable } from "@mainsail/container";

import { IScheduler } from "./types";

@injectable()
export class Scheduler implements IScheduler {
	public async scheduleTimeoutPropose(height: number, round: number): Promise<void> {}

	public async scheduleTimeoutPrevote(height: number, round: number): Promise<void> {}

	public async scheduleTimeoutPrecommit(height: number, round: number): Promise<void> {}
}
