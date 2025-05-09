import { BindingConstraints, MetadataTag } from "inversify";

// https://github.com/inversify/monorepo/blob/main/packages/container/libraries/container/src/binding/calculations/isBindingConstraintsWithTag.ts#L9-L10
function isBindingConstraintsWithTag(tag: MetadataTag, value: unknown): (constraints: BindingConstraints) => boolean {
	return (constraints: BindingConstraints): boolean =>
		constraints.tags.has(tag) && constraints.tags.get(tag) === value;
}

// https://github.com/inversify/monorepo/blob/main/packages/container/libraries/container/src/binding/calculations/isAnyAncestorBindingConstraints.ts
function isAnyAncestorBindingConstraints(
	condition: (constraints: BindingConstraints) => boolean,
): (constraints: BindingConstraints) => boolean {
	return (constraints: BindingConstraints): boolean => {
		for (
			let ancestorMetadata: BindingConstraints | undefined = constraints.getAncestor();
			ancestorMetadata !== undefined;
			ancestorMetadata = ancestorMetadata.getAncestor()
		) {
			if (condition(ancestorMetadata)) {
				return true;
			}
		}

		return false;
	};
}

export function anyAncestorOrTargetTagged(
	tag: MetadataTag,
	value: unknown,
): (constraints: BindingConstraints) => boolean {
	return (constraints: BindingConstraints): boolean =>
		isBindingConstraintsWithTag(tag, value)(constraints) ||
		isAnyAncestorBindingConstraints(isBindingConstraintsWithTag(tag, value))(constraints);
}
