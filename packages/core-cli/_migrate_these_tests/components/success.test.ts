import { Console } from "@arkecosystem/core-test-framework";
import { Success } from "@packages/core-cli/source/components";
import { white } from "kleur";

let cli;
let component;

beforeEach(() => {
	cli = new Console();

	// Bind from src instead of dist to collect coverage.
	cli.app.rebind(Identifiers.Success).to(Success).inSingletonScope();
	component = cli.app.get(Identifiers.Success);
});

describe("Success", () => {
	it("should render the component", () => {
		const spyLogger = jest.spyOn(cli.app.get(Identifiers.Logger), "info");

		component.render("Hello World");

		expect(spyLogger).toHaveBeenCalledWith(white().bgGreen(`[OK] Hello World`));
	});
});
