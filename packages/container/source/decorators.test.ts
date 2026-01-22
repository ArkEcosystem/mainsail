import { Container, inject } from "./ioc.js";
import { injectable } from "./decorators.js";

import { ServiceIdentifier, BindToFluentSyntax, Newable } from "inversify";
import { describe } from "@mainsail/test-framework";

const Identifiers = {
	App: Symbol.for("App"),
	Base: Symbol.for("Base"),
	Child: Symbol.for("Child"),
};

@injectable()
class App {
	public constructor(public readonly container: Container) {
		this.container.bind(Identifiers.App).toConstantValue(this);
	}

	public bind<T>(serviceIdentifier: ServiceIdentifier<T>): BindToFluentSyntax<T> {
		return this.container.bind(serviceIdentifier);
	}

	public get<T>(serviceIdentifier: ServiceIdentifier<T>): T {
		return this.container.get(serviceIdentifier);
	}

	public resolve<T>(constructorFunction: Newable<T>): T {
		return this.container.get(constructorFunction, { autobind: true });
	}

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
	app: App;
}>("Decorators", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		const app = (context.app = new App(new Container()));

		app.bind(Identifiers.Base).to(BaseClass).inSingletonScope();
		app.bind(Identifiers.Child).to(ChildClass).inSingletonScope();
	});

	it("should work with get", ({ app }) => {
		assert.equal(app.get<App>(Identifiers.App).thread(), "main");
		assert.equal(app.get<BaseClass>(Identifiers.Base).getThreadFromBase(), "main");
		assert.equal(app.get<ChildClass>(Identifiers.Child).getThreadFromChild(), "main");
	});

	it("should work with resolve", ({ app }) => {
		assert.equal(app.resolve(BaseClass).getThreadFromBase(), "main");
		assert.equal(app.resolve(ChildClass).getThreadFromChild(), "main");
	});
});
