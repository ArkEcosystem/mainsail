import { Container } from "@packages/core-cli";
import { Console } from "@arkecosystem/core-test-framework";
import { Listing } from "@packages/core-cli/source/components";

let cli;
let component;

beforeEach(() => {
	cli = new Console();

	// Bind from src instead of dist to collect coverage.
	cli.app.rebind(Identifiers.Listing).to(Listing).inSingletonScope();
	component = cli.app.get(Identifiers.Listing);
});

describe("Listing", () => {
	it("should render the component", () => {
		const spyLogger = jest.spyOn(cli.app.get(Identifiers.Logger), "log");

		component.render([1, 2, 3]);

		expect(spyLogger).toHaveBeenCalledTimes(3);
		expect(spyLogger).toHaveBeenCalledWith(" * 1");
		expect(spyLogger).toHaveBeenCalledWith(" * 2");
		expect(spyLogger).toHaveBeenCalledWith(" * 3");
	});
});
