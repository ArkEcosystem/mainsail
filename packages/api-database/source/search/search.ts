import type { NumericCriteria, OrCriteria } from "./types/criteria.js";
import type {
	AndExpression,
	BetweenExpression,
	EqualExpression,
	Expression,
	GreaterThanEqualExpression,
	JsonFieldAccessor,
	LessThanEqualExpression,
	OrExpression,
} from "./types/expressions.js";

export const optimizeExpression = <TEntity>(expression: Expression<TEntity>): Expression<TEntity> => {
	switch (expression.op) {
		case "and": {
			const optimized = expression.expressions.map(optimizeExpression);
			const flattened = [] as Expression<TEntity>[];

			for (const e of optimized) {
				flattened.push(...(e.op === "and" ? e.expressions : [e]));
			}

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
			const flattened = [] as Expression<TEntity>[];

			for (const e of optimized) {
				flattened.push(...(e.op === "or" ? e.expressions : [e]));
			}

			if (flattened.every((e) => e.op === "false")) {
				return { op: "false" };
			}
			if (flattened.some((e) => e.op === "true")) {
				return { op: "true" };
			}

			const expressions = flattened.filter((e) => e.op !== "false");
			return expressions.length === 1 ? expressions[0] : { expressions, op: "or" };
		}

		default: {
			return expression;
		}
	}
};

export const someOrCriteria = <TCriteria>(
	criteria: OrCriteria<TCriteria>,
	predicate: (c: TCriteria) => boolean,
): boolean => {
	if (criteria === undefined) {
		return false;
	}
	if (Array.isArray(criteria)) {
		return criteria.some(predicate);
	}
	return predicate(criteria);
};

export const everyOrCriteria = <TCriteria>(
	criteria: OrCriteria<TCriteria>,
	predicate: (c: TCriteria) => boolean,
): boolean => {
	if (criteria === undefined) {
		return true;
	}
	if (Array.isArray(criteria)) {
		return criteria.every(predicate);
	}
	return predicate(criteria);
};

export const hasOrCriteria = <TCriteria>(criteria: OrCriteria<TCriteria>): boolean =>
	someOrCriteria(criteria, () => true);

export const handleAndCriteria = async <TEntity, TCriteria extends Record<string, unknown>>(
	criteria: TCriteria,
	callback: <K extends keyof TCriteria>(key: K) => Promise<Expression<TEntity>>,
): Promise<AndExpression<TEntity>> => {
	const promises = Object.keys(criteria)
		.filter((key) => criteria[key] !== undefined)
		.map((key) => callback(key as keyof TCriteria));
	const expressions = await Promise.all(promises);
	return { expressions, op: "and" };
};

export const handleOrCriteria = async <TEntity, TCriteria>(
	criteria: OrCriteria<TCriteria>,
	callback: (criteria: TCriteria) => Promise<Expression<TEntity>>,
): Promise<OrExpression<TEntity>> => {
	if (Array.isArray(criteria)) {
		const promises = criteria.map((c) => callback(c));
		const expressions = await Promise.all(promises);
		return { expressions, op: "or" };
	} else {
		const expression = await callback(criteria);
		return { expressions: [expression], op: "or" };
	}
};

export const handleComparisonCriteria = async <TEntity, TProperty extends keyof TEntity>(
	property: TProperty,
	criteria: NumericCriteria<NonNullable<TEntity[TProperty]>>,
	jsonFieldAccessor?: JsonFieldAccessor,
): Promise<
	| EqualExpression<TEntity>
	| BetweenExpression<TEntity>
	| GreaterThanEqualExpression<TEntity>
	| LessThanEqualExpression<TEntity>
> => {
	if (typeof criteria === "object") {
		if ("from" in criteria && "to" in criteria) {
			return { from: criteria.from, jsonFieldAccessor, op: "between", property, to: criteria.to };
		}
		if ("from" in criteria) {
			return { jsonFieldAccessor, op: "greaterThanEqual", property, value: criteria.from };
		}
		/* istanbul ignore else */
		if ("to" in criteria) {
			return { jsonFieldAccessor, op: "lessThanEqual", property, value: criteria.to };
		}
	}

	return { jsonFieldAccessor, op: "equal", property, value: criteria };
};

export const groupEqualities = <TEntity>(expression: Expression<TEntity>): Expression<TEntity> => {
	if (expression.op === "and") {
		return { expressions: expression.expressions.map((e) => groupEqualities(e)), op: "and" };
	}

	if (expression.op !== "or") {
		return expression;
	}

	const equalities = new Map<keyof TEntity, unknown[]>();
	const recipients: string[] = [];
	const others: Expression<TEntity>[] = [];

	for (const e of expression.expressions.map((e) => groupEqualities(e))) {
		if (e.op === "equal" && !e.jsonFieldAccessor) {
			const values = equalities.get(e.property) ?? [];
			values.push(e.value);
			equalities.set(e.property, values);
		} else if (e.op === "multiPayment") {
			recipients.push(...e.value);
		} else {
			others.push(e);
		}
	}

	const expressions: Expression<TEntity>[] = [...equalities].map(([property, values]) =>
		values.length === 1 ? { op: "equal", property, value: values[0] } : { op: "in", property, values },
	);

	if (recipients.length > 0) {
		expressions.push({ op: "multiPayment", value: recipients });
	}

	expressions.push(...others);

	return expressions.length === 1 ? expressions[0] : { expressions, op: "or" };
};
