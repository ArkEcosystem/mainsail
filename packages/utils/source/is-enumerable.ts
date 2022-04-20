export const isEnumerable = <T>(object: T, property: number | string): boolean =>
	Object.prototype.propertyIsEnumerable.call(object, property);
