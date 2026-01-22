import { bold, red, white } from "kleur/colors";
import os from "os";
import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { AppHeader } from "./app-header";
import { Console } from "../test/index.ts";

describe<{
	component: AppHeader;
	cli: Console;
}>("AppHeader", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();

		context.cli.app.rebind(Identifiers.Cli.Component.AppHeader).to(AppHeader).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.AppHeader);
	});

	it("should render the component", ({ component, cli }) => {
		assert.equal(
			component.render(),
			`${red(bold(cli.pkg.description))} ${white(
				bold(`[${cli.pkg.version} | ${process.version} | ${os.platform()}@${os.arch()}]`),
			)}`,
		);
	});
});
