import { BindingConstraints } from "inversify";

export const anyAncestorOrTargetTaggedFirst =
	(key: string | number | symbol, value: any) =>
	(request: BindingConstraints) =>
	(name: string) =>
	(bindingconstraints: BindingConstraints): boolean =>
		bindingconstraints.name === name;

// {
// for (;;) {
// 	const targetTags = request.target.getCustomTags();
// 	if (targetTags) {
// 		const targetTag = targetTags.find((t) => t.key === key);
// 		if (targetTag) {
// 			return targetTag.value === value;
// 		}
// 	}
// 	if (!request.parentRequest) {
// 		return false;
// 	}
// 	request = request.parentRequest;
// }
// };
