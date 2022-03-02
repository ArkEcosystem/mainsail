import { Console } from "@arkecosystem/core-test-framework";
import { TaskList } from "@packages/core-cli/source/components";

let cli;
let component;

beforeEach(() => {
	cli = new Console();

	// Bind from src instead of dist to collect coverage.
	cli.app.rebind(Identifiers.TaskList).to(TaskList).inSingletonScope();
	component = cli.app.get(Identifiers.TaskList);
});

describe("TaskList", () => {
	it("should render the component", async () => {
		const fakeTask = jest.fn();

		await component.render([
			{
				task: fakeTask,
				title: "description",
			},
		]);

		expect(fakeTask).toHaveBeenCalled();
	});
});
