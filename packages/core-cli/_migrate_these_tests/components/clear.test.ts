import { Console } from "@arkecosystem/core-test-framework";
import { Clear } from "@packages/core-cli/source/components";

let cli;
let component;

beforeEach(() => {
	cli = new Console();

	// Bind from src instead of dist to collect coverage.
	cli.app.rebind(Identifiers.Clear).to(Clear).inSingletonScope();
	component = cli.app.get(Identifiers.Clear);
});

describe("Clear", () => {
	it("should render the component", () => {
		const spyWrite = jest.spyOn(process.stdout, "write");

		component.render();

		expect(spyWrite).toHaveBeenCalledWith("\u001B[2J");
		expect(spyWrite).toHaveBeenCalledWith("\u001B[0f");
	});
});
