import { bold, red, white } from "kleur/colors";
import os from "os";

import { Console, describe } from "../../../test-framework/source";
import { Identifiers } from "../ioc/index.js";
import { AppHeader } from "./app-header";

describe<{
	component: AppHeader;
	cli: Console;
}>("AppHeader", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();

		context.cli.app.rebind(Identifiers.AppHeader).to(AppHeader).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.AppHeader);
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
