// import { Console, describe } from "../../../test-framework/source";
// import { Identifiers } from "../ioc/index.js";
// import { TaskList } from "./task-list";

// describe<{
// 	component: TaskList;
// 	cli: Console;
// }>("TaskList", ({ beforeEach, it, assert, spyFn }) => {
// 	beforeEach((context) => {
// 		context.cli = new Console();
// 		context.cli.app.rebind(Identifiers.TaskList).to(TaskList).inSingletonScope();
// 		context.component = context.cli.app.get(Identifiers.TaskList);
// 	});

// 	it("should render the component", async ({ component, cli }) => {
// 		const fakeTask = spyFn();

// 		await component.render([
// 			{
// 				task: fakeTask,
// 				title: "description",
// 			},
// 		]);

// 		assert.true(fakeTask.calledOnce);
// 	});
// });
