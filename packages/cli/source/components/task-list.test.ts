import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import { TaskList } from "./task-list";
import { Console } from "../test/index.js";

describe<{
	component: TaskList;
	cli: Console;
}>("TaskList", ({ beforeEach, it, assert, spyFn }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.TaskList).to(TaskList).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.TaskList);
	});

	it("should render the component", async ({ component, cli }) => {
		const fakeTask = spyFn();

		await component.render([
			{
				task: () => fakeTask.call(),
				title: "description",
			},
		]);

		fakeTask.calledOnce();
	});
});
