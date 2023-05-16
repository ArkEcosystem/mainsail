import Listr from "listr";

@injectable()
export class TaskList {
	public async render(tasks: { title: string; task: any }[]): Promise<void> {
		return new Listr(tasks).run();
	}
}
