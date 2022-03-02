import { Console } from "@arkecosystem/core-test-framework";
import { Warning } from "@packages/core-cli/source/components";
import { white } from "kleur";

let cli;
let component;

beforeEach(() => {
	cli = new Console();

	// Bind from src instead of dist to collect coverage.
	cli.app.rebind(Identifiers.Warning).to(Warning).inSingletonScope();
	component = cli.app.get(Identifiers.Warning);
});

describe("Warning", () => {
	it("should render the component", () => {
		const spyLogger = jest.spyOn(cli.app.get(Identifiers.Logger), "warning");

		component.render("Hello World");

		expect(spyLogger).toHaveBeenCalledWith(white().bgYellow(`[WARNING] Hello World`));
	});
});
