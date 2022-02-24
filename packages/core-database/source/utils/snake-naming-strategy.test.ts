import { SnakeNamingStrategy } from "./snake-naming-strategy";
import { describe } from "../../../core-test-framework";

describe("SnakeNamingStrategy.tableName", ({ assert, it }) => {
	it("should convert class name to snake-case table name", () => {
		const snakeNamingStrategy = new SnakeNamingStrategy();
		const snakeName = snakeNamingStrategy.tableName("MyClass", "");
		assert.equal(snakeName, "my_class");
	});

	it("should return custom name if provided", () => {
		const snakeNamingStrategy = new SnakeNamingStrategy();
		const snakeName = snakeNamingStrategy.tableName("MyClass", "MYCLASSTABLE");
		assert.equal(snakeName, "MYCLASSTABLE");
	});
});

describe("SnakeNamingStrategy.columnName", ({ assert, it }) => {
	it("should convert class property to snake-case column name", () => {
		const snakeNamingStrategy = new SnakeNamingStrategy();
		const snakeName = snakeNamingStrategy.columnName("myProperty", "", []);
		assert.equal(snakeName, "my_property");
	});

	it("should return custom name if provided", () => {
		const snakeNamingStrategy = new SnakeNamingStrategy();
		const snakeName = snakeNamingStrategy.columnName("myProperty", "MYPROPERTYCOLUMN", []);
		assert.equal(snakeName, "MYPROPERTYCOLUMN");
	});
});

describe("SnakeNamingStrategy.relationName", ({ assert, it }) => {
	it("should convert class property to snake-case column name", () => {
		const snakeNamingStrategy = new SnakeNamingStrategy();
		const snakeName = snakeNamingStrategy.relationName("myProperty");
		assert.equal(snakeName, "my_property");
	});
});

describe("SnakeNamingStrategy.joinColumnName", ({ assert, it }) => {
	it("should convert class property to snake-case column name", () => {
		const snakeNamingStrategy = new SnakeNamingStrategy();
		const snakeName = snakeNamingStrategy.joinColumnName("MyClass", "myProperty");
		assert.equal(snakeName, "my_class_my_property");
	});
});

describe("SnakeNamingStrategy.joinTableName", ({ assert, it }) => {
	it("should convert class and property to snake-case table name", () => {
		const snakeNamingStrategy = new SnakeNamingStrategy();
		const snakeName = snakeNamingStrategy.joinTableName("MyClass", "MyOtherClass", "myProperty", "myOtherProperty");
		assert.equal(snakeName, "my_class_my_property__my_other_class");
	});
});

describe("SnakeNamingStrategy.joinTableColumnName", ({ assert, it }) => {
	it("should convert class and property to snake-case column name", () => {
		const snakeNamingStrategy = new SnakeNamingStrategy();
		const snakeName = snakeNamingStrategy.joinTableColumnName("MyClass", "myProperty", "");
		assert.equal(snakeName, "my_class_my_property");
	});

	it("should convert class and column to snake-case column name", () => {
		const snakeNamingStrategy = new SnakeNamingStrategy();
		const snakeName = snakeNamingStrategy.joinTableColumnName("MyClass", "myProperty", "my_property_column");
		assert.equal(snakeName, "my_class_my_property_column");
	});
});

describe("SnakeNamingStrategy.classTableInheritanceParentColumnName", ({ assert, it }) => {
	it("should convert parent table and column to column name", () => {
		const snakeNamingStrategy = new SnakeNamingStrategy();
		const snakeName = snakeNamingStrategy.classTableInheritanceParentColumnName("my_class", "id");
		assert.equal(snakeName, "my_class_id");
	});
});

describe("SnakeNamingStrategy.eagerJoinRelationAlias", ({ assert, it }) => {
	it("should convert property path to alias", () => {
		const snakeNamingStrategy = new SnakeNamingStrategy();
		const snakeName = snakeNamingStrategy.eagerJoinRelationAlias("my_table_alias", "some.property");
		assert.equal(snakeName, "my_table_alias__some_property");
	});
});
