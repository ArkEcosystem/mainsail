import { Console } from "@arkecosystem/core-test-framework";
import { Log } from "@packages/core-cli/source/components";

let cli;
let component;

beforeEach(() => {
	cli = new Console();

	// Bind from src instead of dist to collect coverage.
	cli.app.rebind(Identifiers.Log).to(Log).inSingletonScope();
	component = cli.app.get(Identifiers.Log);
});

describe("Log", () => {
	it("should render the component", () => {
		const spyLogger = jest.spyOn(cli.app.get(Identifiers.Logger), "log");

		component.render("Hello World");

		expect(spyLogger).toHaveBeenCalledWith("Hello World");
	});
});
