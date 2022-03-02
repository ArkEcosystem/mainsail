import { Search } from "@arkecosystem/core-contracts";

export const optimizeExpression = <TEntity>(expression: Search.Expression<TEntity>): Search.Expression<TEntity> => {
	switch (expression.op) {
		case "and": {
			const optimized = expression.expressions.map(optimizeExpression);
			const flattened = optimized.reduce(
				(acc, e) => (e.op === "and" ? [...acc, ...e.expressions] : [...acc, e]),
				[] as Search.Expression<TEntity>[],
			);

			if (flattened.every((e) => e.op === "true")) {
				return { op: "true" };
			}
			if (flattened.some((e) => e.op === "false")) {
				return { op: "false" };
			}

			const expressions = flattened.filter((e) => e.op !== "true");
			return expressions.length === 1 ? expressions[0] : { expressions, op: "and" };
		}

		case "or": {
			const optimized = expression.expressions.map(optimizeExpression);
			const flattened = optimized.reduce(
				(acc, e) => (e.op === "or" ? [...acc, ...e.expressions] : [...acc, e]),
				[] as Search.Expression<TEntity>[],
			);

			if (flattened.every((e) => e.op === "false")) {
				return { op: "false" };
			}
			if (flattened.some((e) => e.op === "true")) {
				return { op: "true" };
			}

			const expressions = flattened.filter((e) => e.op !== "false");
			return expressions.length === 1 ? expressions[0] : { expressions, op: "or" };
		}

		default:
			return expression;
	}
};

export const someOrCriteria = <TCriteria>(
	criteria: Search.OrCriteria<TCriteria>,
	predicate: (c: TCriteria) => boolean,
): boolean => {
	if (typeof criteria === "undefined") {
		return false;
	}
	if (Array.isArray(criteria)) {
		return criteria.some(predicate);
	}
	return predicate(criteria);
};

export const everyOrCriteria = <TCriteria>(
	criteria: Search.OrCriteria<TCriteria>,
	predicate: (c: TCriteria) => boolean,
): boolean => {
	if (typeof criteria === "undefined") {
		return true;
	}
	if (Array.isArray(criteria)) {
		return criteria.every(predicate);
	}
	return predicate(criteria);
};

export const hasOrCriteria = <TCriteria>(criteria: Search.OrCriteria<TCriteria>): boolean =>
	someOrCriteria(criteria, () => true);

export const handleAndCriteria = async <TEntity, TCriteria>(
	criteria: TCriteria,
	cb: <K extends keyof TCriteria>(key: K) => Promise<Search.Expression<TEntity>>,
): Promise<Search.AndExpression<TEntity>> => {
	const promises = Object.keys(criteria)
		.filter((key) => typeof criteria[key] !== "undefined")
		.map((key) => cb(key as keyof TCriteria));
	const expressions = await Promise.all(promises);
	return { expressions, op: "and" };
};

export const handleOrCriteria = async <TEntity, TCriteria>(
	criteria: Search.OrCriteria<TCriteria>,
	cb: (criteria: TCriteria) => Promise<Search.Expression<TEntity>>,
): Promise<Search.OrExpression<TEntity>> => {
	if (Array.isArray(criteria)) {
		const promises = criteria.map((c) => cb(c));
		const expressions = await Promise.all(promises);
		return { expressions, op: "or" };
	} else {
		const expression = await cb(criteria);
		return { expressions: [expression], op: "or" };
	}
};

export const handleNumericCriteria = async <TEntity, TProperty extends keyof TEntity>(
	property: TProperty,
	criteria: Search.NumericCriteria<NonNullable<TEntity[TProperty]>>,
): Promise<
	| Search.EqualExpression<TEntity>
	| Search.BetweenExpression<TEntity>
	| Search.GreaterThanEqualExpression<TEntity>
	| Search.LessThanEqualExpression<TEntity>
> => {
	if (typeof criteria === "object") {
		if ("from" in criteria && "to" in criteria) {
			return { from: criteria.from, op: "between", property, to: criteria.to };
		}
		if ("from" in criteria) {
			return { op: "greaterThanEqual", property, value: criteria.from };
		}

		if ("to" in criteria) {
			return { op: "lessThanEqual", property, value: criteria.to };
		}
	}

	return { op: "equal", property, value: criteria };
};
