import "reflect-metadata";

import { injectable as importedInjectable, injectFromBase } from "inversify";

export function injectable(): ClassDecorator {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	return function (target: Function): void {
		importedInjectable()(target);
		const basePrototype = Object.getPrototypeOf(target.prototype);
		const hasBaseClass = basePrototype && basePrototype !== Object.prototype;

		if (
			hasBaseClass &&
			Reflect.getMetadataKeys(basePrototype.constructor).includes(
				"@inversifyjs/core/classIsInjectableFlagReflectKey",
			)
		) {
			injectFromBase()(target);
		}
	};
}
