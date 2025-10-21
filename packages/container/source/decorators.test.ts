import { Container, inject } from "./ioc.js";
import { injectable } from "./decorators.js";

// import { Container, inject, injectable } from "inversify";

import { describe } from "../../test-framework/source";

const Identifiers = {
	App: Symbol.for("App"),
	Base: Symbol.for("Base"),
	Child: Symbol.for("Child"),
};

@injectable()
class App {
	public thread(): string {
		return "main";
	}
}

@injectable()
class BaseClass {
	// @ts-ignore
	@inject(Identifiers.App)
	protected readonly app!: App;

	public getThreadFromBase(): string {
		return this.app.thread();
	}
}

@injectable()
class ChildClass extends BaseClass {
	public getThreadFromChild(): string {
		return this.app.thread();
	}
}

describe<{
	container: Container;
}>("anyAncestorOrTargetTaggedFirst", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container();
		const container = context.container;
		container.bind(Identifiers.App).to(App).inSingletonScope();
		container.bind(Identifiers.Base).to(BaseClass).inSingletonScope();
		container.bind(Identifiers.Child).to(ChildClass).inSingletonScope();
	});

	it("should work with bindings", ({ container }) => {
		assert.equal(container.get<App>(Identifiers.App).thread(), "main");
		assert.equal(container.get<BaseClass>(Identifiers.Base).getThreadFromBase(), "main");
		assert.equal(container.get<ChildClass>(Identifiers.Child).getThreadFromChild(), "main");
	});

	it("should work with get", ({ container }) => {
		assert.equal(container.get(App, { autobind: true }).thread(), "main");
		assert.equal(container.get(BaseClass, { autobind: true }).getThreadFromBase(), "main");
		assert.equal(container.get(ChildClass, { autobind: true }).getThreadFromChild(), "main");
	});
});
