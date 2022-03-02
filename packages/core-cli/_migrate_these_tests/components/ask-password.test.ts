import { Console } from "@arkecosystem/core-test-framework";
import { AskPassword } from "@packages/core-cli/source/components";
import prompts from "prompts";

let cli;
let component;

beforeEach(() => {
	cli = new Console();

	// Bind from src instead of dist to collect coverage.
	cli.app.rebind(Identifiers.AskPassword).to(AskPassword).inSingletonScope();
	component = cli.app.get(Identifiers.AskPassword);
});

describe("AskPassword", () => {
	it("should render the component", async () => {
		prompts.inject(["password"]);

		await expect(component.render("Hello World")).resolves.toBe("password");
	});
});
