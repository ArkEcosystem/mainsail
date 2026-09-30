import { describe } from "@mainsail/test-runner";

import { SnakeNamingStrategy } from "./snake-naming-strategy";

describe<{
	subject: SnakeNamingStrategy;
}>("SnakeNamingStrategy", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.subject = new SnakeNamingStrategy();
	});

	it("tableName should use the custom name when provided", ({ subject }) => {
		assert.is(subject.tableName("MyEntityName", "explicit_table"), "explicit_table");
	});

	it("tableName should snake_case the class name when no custom name", ({ subject }) => {
		assert.is(subject.tableName("MyEntityName", ""), "my_entity_name");
	});

	it("columnName should snake_case the property name with no prefixes", ({ subject }) => {
		assert.is(subject.columnName("propertyName", "", []), "property_name");
	});

	it("columnName should prepend snake_cased embedded prefixes", ({ subject }) => {
		assert.is(subject.columnName("propertyName", "", ["Embedded", "Prefix"]), "embedded_prefixproperty_name");
	});

	it("columnName should use the custom name over the property name", ({ subject }) => {
		assert.is(subject.columnName("propertyName", "customCol", []), "customCol");
	});

	it("relationName should snake_case the property name", ({ subject }) => {
		assert.is(subject.relationName("relatedEntity"), "related_entity");
	});

	it("joinColumnName should snake_case relation + referenced column", ({ subject }) => {
		assert.is(subject.joinColumnName("MyEntity", "id"), "my_entity_id");
	});

	it("joinTableName should replace dots in the first property name and snake_case", ({ subject }) => {
		assert.is(
			subject.joinTableName("FirstTable", "SecondTable", "first.Property", "secondProperty"),
			"first_table_first_property_second_table",
		);
	});

	it("joinTableColumnName should use the column name when provided", ({ subject }) => {
		assert.is(subject.joinTableColumnName("MyTable", "propertyName", "columnName"), "my_table_column_name");
	});

	it("joinTableColumnName should fall back to the property name", ({ subject }) => {
		assert.is(subject.joinTableColumnName("MyTable", "propertyName"), "my_table_property_name");
	});

	it("classTableInheritanceParentColumnName should snake_case parent table + id property", ({ subject }) => {
		assert.is(subject.classTableInheritanceParentColumnName("ParentTable", "parentId"), "parent_table_parent_id");
	});

	it("eagerJoinRelationAlias should join alias and propertyPath with a double underscore", ({ subject }) => {
		assert.is(subject.eagerJoinRelationAlias("alias", "relation.field"), "alias__relation_field");
	});

	it("eagerJoinRelationAlias only replaces the first dot in the property path (documents current behavior)", ({
		subject,
	}) => {
		assert.is(subject.eagerJoinRelationAlias("alias", "a.b.c"), "alias__a_b.c");
	});
});
