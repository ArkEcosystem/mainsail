import { injectable } from "@mainsail/container";
import Listr from "listr";

export type { ListrTask as Task } from "listr";

@injectable()
export class TaskList {
	public async render(tasks: Listr.ListrTask[]): Promise<void> {
		return new Listr(tasks).run();
	}
}
