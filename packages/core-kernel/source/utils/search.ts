import { Contracts } from "@arkecosystem/core-contracts";

export const optimizeExpression = <TEntity>(
	expression: Contracts.Search.Expression<TEntity>,
): Contracts.Search.Expression<TEntity> => {
	switch (expression.op) {
		case "and": {
			const optimized = expression.expressions.map(optimizeExpression);
			const flattened = optimized.reduce(
				(accumulator, e) => (e.op === "and" ? [...accumulator, ...e.expressions] : [...accumulator, e]),
				[] as Contracts.Search.Expression<TEntity>[],
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
				(accumulator, e) => (e.op === "or" ? [...accumulator, ...e.expressions] : [...accumulator, e]),
				[] as Contracts.Search.Expression<TEntity>[],
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
	criteria: Contracts.Search.OrCriteria<TCriteria>,
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
	criteria: Contracts.Search.OrCriteria<TCriteria>,
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

export const hasOrCriteria = <TCriteria>(criteria: Contracts.Search.OrCriteria<TCriteria>): boolean =>
	someOrCriteria(criteria, () => true);

export const handleAndCriteria = async <TEntity, TCriteria>(
	criteria: TCriteria,
	callback: <K extends keyof TCriteria>(key: K) => Promise<Contracts.Search.Expression<TEntity>>,
): Promise<Contracts.Search.AndExpression<TEntity>> => {
	const promises = Object.keys(criteria)
		.filter((key) => typeof criteria[key] !== "undefined")
		.map((key) => callback(key as keyof TCriteria));
	const expressions = await Promise.all(promises);
	return { expressions, op: "and" };
};

export const handleOrCriteria = async <TEntity, TCriteria>(
	criteria: Contracts.Search.OrCriteria<TCriteria>,
	callback: (criteria: TCriteria) => Promise<Contracts.Search.Expression<TEntity>>,
): Promise<Contracts.Search.OrExpression<TEntity>> => {
	if (Array.isArray(criteria)) {
		const promises = criteria.map((c) => callback(c));
		const expressions = await Promise.all(promises);
		return { expressions, op: "or" };
	} else {
		const expression = await callback(criteria);
		return { expressions: [expression], op: "or" };
	}
};

export const handleNumericCriteria = async <TEntity, TProperty extends keyof TEntity>(
	property: TProperty,
	criteria: Contracts.Search.NumericCriteria<NonNullable<TEntity[TProperty]>>,
): Promise<
	| Contracts.Search.EqualExpression<TEntity>
	| Contracts.Search.BetweenExpression<TEntity>
	| Contracts.Search.GreaterThanEqualExpression<TEntity>
	| Contracts.Search.LessThanEqualExpression<TEntity>
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
