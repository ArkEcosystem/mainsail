import os from "os";
import { red, white } from "kleur";

import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
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
			`${red().bold(cli.pkg.description)} ${white().bold(
				`[${cli.pkg.version} | ${process.version} | ${os.platform()}@${os.arch()}]`,
			)}`,
		);
	});
});
