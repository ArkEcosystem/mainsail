export type TrueExpression = {
	op: "true";
};

export type FalseExpression = {
	op: "false";
};

export type EqualExpression<TEntity, TValue = unknown> = {
	property: keyof TEntity;
	jsonFieldAccessor?: JsonFieldAccessor;
	op: "equal";
	value: TValue;
};

export type NotEqualExpression<TEntity, TValue = unknown> = {
	property: keyof TEntity;
	jsonFieldAccessor?: JsonFieldAccessor;
	op: "notEqual";
	value: TValue;
};

export type BetweenExpression<TEntity, TValue = unknown> = {
	property: keyof TEntity;
	jsonFieldAccessor?: JsonFieldAccessor;
	op: "between";
	from: TValue;
	to: TValue;
};

export type GreaterThanEqualExpression<TEntity, TValue = unknown> = {
	property: keyof TEntity;
	jsonFieldAccessor?: JsonFieldAccessor;
	op: "greaterThanEqual";
	value: TValue;
};

export type LessThanEqualExpression<TEntity, TValue = unknown> = {
	property: keyof TEntity;
	jsonFieldAccessor?: JsonFieldAccessor;
	op: "lessThanEqual";
	value: TValue;
};

export type LikeExpression<TEntity, TValue = unknown> = {
	property: keyof TEntity;
	jsonFieldAccessor?: JsonFieldAccessor;
	op: "like";
	pattern: TValue;
};

export type ContainsExpression<TEntity, TValue = unknown> = {
	property: keyof TEntity;
	jsonFieldAccessor?: JsonFieldAccessor;
	op: "contains";
	value: TValue;
};

export type AndExpression<TEntity> = {
	op: "and";
	expressions: Expression<TEntity>[];
};

export type OrExpression<TEntity> = {
	op: "or";
	expressions: Expression<TEntity>[];
};

export type JsonbAttributeExists<TEntity> = {
	property: keyof TEntity;
	op: "jsonbAttributeExists";
	attribute: string;
};

export type FunctionSigExpression<TEntity> = {
	property: keyof TEntity;
	op: "functionSig";
	value: string;
};

export type MultiPaymentExpression = {
	op: "multiPayment";
	value: string[];
};

export type NotNullExpression<TEntity> = {
	property: keyof TEntity;
	op: "notNull";
};

export type Expression<TEntity> =
	| TrueExpression
	| FalseExpression
	| EqualExpression<TEntity>
	| NotEqualExpression<TEntity>
	| BetweenExpression<TEntity>
	| GreaterThanEqualExpression<TEntity>
	| LessThanEqualExpression<TEntity>
	| LikeExpression<TEntity>
	| ContainsExpression<TEntity>
	| AndExpression<TEntity>
	| OrExpression<TEntity>
	| JsonbAttributeExists<TEntity>
	| FunctionSigExpression<TEntity>
	| MultiPaymentExpression
	| NotNullExpression<TEntity>;

export type JsonFieldOperator = "->>";
export type JsonFieldCastType = "bigint" | "numeric";
export type JsonFieldAccessor = {
	operator: JsonFieldOperator;
	fieldName: string;
	cast?: JsonFieldCastType;
};
