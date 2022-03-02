import { Console } from "@arkecosystem/core-test-framework";
import { NewLine } from "@packages/core-cli/source/components";

let cli;
let component;

beforeEach(() => {
	cli = new Console();

	// Bind from src instead of dist to collect coverage.
	cli.app.rebind(Identifiers.NewLine).to(NewLine).inSingletonScope();
	component = cli.app.get(Identifiers.NewLine);
});

describe("NewLine", () => {
	it("should render the component", () => {
		const spyLogger = jest.spyOn(cli.app.get(Identifiers.Logger), "log");

		component.render();

		expect(spyLogger).toHaveBeenCalledWith("\n");
	});
});
