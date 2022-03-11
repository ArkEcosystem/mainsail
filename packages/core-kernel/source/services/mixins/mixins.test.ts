import { describe } from "../../../../core-test-framework";

import { MixinService } from "./mixins";
import { Constructor } from "../../types/container";

class User {
	name: string;

	constructor(name: string) {
		this.name = name;
	}
}

function Timestamped<TBase extends Constructor>(Base: TBase) {
	return class extends Base {
		timestamp = new Date("2019-08-29");
	};
}

function Tagged<TBase extends Constructor>(Base: TBase) {
	return class extends Base {
		tag: string | null;

		constructor(...args: any[]) {
			super(...args);
			this.tag = "i am tagged";
		}
	};
}

function Activatable<TBase extends Constructor>(Base: TBase) {
	return class extends Base {
		isActivated = false;

		activate() {
			this.isActivated = true;
		}

		deactivate() {
			this.isActivated = false;
		}
	};
}

type AnyFunction<T = any> = (...input: any[]) => T;
type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>;

type TTimestamped = Mixin<typeof Timestamped>;
type TActivatable = Mixin<typeof Activatable>;
type TTagged = Mixin<typeof Tagged>;

type MixinUser = TTimestamped & TActivatable & TTagged & User;

describe<{
	mixins: MixinService;
}>("Mixins", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.mixins = new MixinService();
	});

	it("should register all mixins", async (context) => {
		context.mixins.set("timestamped", Timestamped);
		context.mixins.set("tagged", Tagged);
		context.mixins.set("activatable", Activatable);

		assert.equal(context.mixins.get("timestamped"), Timestamped);
		assert.equal(context.mixins.get("tagged"), Tagged);
		assert.equal(context.mixins.get("activatable"), Activatable);

		assert.true(context.mixins.has("timestamped"));
		assert.true(context.mixins.has("tagged"));
		assert.true(context.mixins.has("activatable"));

		context.mixins.forget("timestamped");
		context.mixins.forget("tagged");
		context.mixins.forget("activatable");

		assert.false(context.mixins.has("timestamped"));
		assert.false(context.mixins.has("tagged"));
		assert.false(context.mixins.has("activatable"));
	});

	it("should apply a single macro", async (context) => {
		context.mixins.set("timestamped", Timestamped);

		const user: MixinUser = new (context.mixins.apply<MixinUser>("timestamped", User))();

		assert.equal(user.timestamp, new Date("2019-08-29"));
	});

	it("should apply all mixins", async (context) => {
		context.mixins.set("timestamped", Timestamped);
		context.mixins.set("tagged", Tagged);
		context.mixins.set("activatable", Activatable);

		const user: MixinUser = new (context.mixins.apply<MixinUser>(["timestamped", "tagged", "activatable"], User))();

		assert.equal(user.timestamp, new Date("2019-08-29"));
		assert.false(user.isActivated);
		assert.equal(user.tag, "i am tagged");
	});
});
