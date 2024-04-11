import { hasProperty } from "./has-property.js";
import { some } from "./some.js";

export const hasSomeProperty = <T>(object: T, properties: string[]): boolean =>
	some(properties, (property: string) => hasProperty(object, property));
