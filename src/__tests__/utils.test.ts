import {
  defaultScalarMap,
  getReasonFieldType,
  getFieldTypeDetails,
  IField
} from "../utils";
import {
  parse,
  DefinitionNode,
  ObjectTypeDefinitionNode,
  EnumTypeDefinitionNode
} from "graphql";

const isObjectTypeDefinition = (
  node: DefinitionNode
): node is ObjectTypeDefinitionNode => {
  return node.kind === "ObjectTypeDefinition";
};

const isEnumTypeDefinition = (
  node: DefinitionNode
): node is EnumTypeDefinitionNode => {
  return node.kind === "EnumTypeDefinition";
};

const schema = `
    type TestType {
      scalarString: String
      nonNullScalar: String!
      scalarList: [String]
      nonNullListScalar: [String]!
      nullListNonNullScalar: [String!]
      nonNullListNonNullScalar: [String!]!
      enum: Enum
      nonNullEnum: Enum!
      enumList: [Enum]
      nonNullListEnum: [Enum]!
      nullListNonNullEnum: [Enum!]
      nonNullListNonNullEnum: [Enum!]!
      object: TestType
      nonNullObject: TestType!
      objectList: [TestType]
      nonNullListObject: [TestType]!
      nullListNonNullObject: [TestType!]
      nonNullListNonNullObject: [TestType!]!
    }

    enum Enum {
      ONE
      TWO
    }
    `;

const detailsMap: { [key: string]: IField } = {
  scalarString: {
    isList: false,
    isNullableList: false,
    isEnum: false,
    scalar: "string",
    isNullable: true,
    typeName: "String",
    name: "scalarString"
  },
  nonNullScalar: {
    isList: false,
    isNullableList: false,
    isEnum: false,
    scalar: "string",
    isNullable: false,
    typeName: "String",
    name: "nonNullScalar"
  },
  scalarList: {
    isList: true,
    isNullableList: true,
    isEnum: false,
    scalar: "string",
    isNullable: true,
    typeName: "String",
    name: "scalarList"
  },
  nonNullListScalar: {
    isList: true,
    isNullableList: false,
    isEnum: false,
    scalar: "string",
    isNullable: true,
    typeName: "String",
    name: "nonNullListScalar"
  },
  nonNullListNonNullScalar: {
    isList: true,
    isNullableList: false,
    isEnum: false,
    scalar: "string",
    isNullable: false,
    typeName: "String",
    name: "nonNullListNonNullScalar"
  },
  enum: {
    isList: false,
    isNullableList: false,
    isEnum: true,
    scalar: null,
    isNullable: true,
    typeName: "Enum",
    name: "enum"
  },
  nonNullEnum: {
    isList: false,
    isNullableList: false,
    isEnum: true,
    scalar: null,
    isNullable: false,
    typeName: "Enum",
    name: "nonNullEnum"
  },
  enumList: {
    isList: true,
    isNullableList: true,
    isEnum: true,
    scalar: null,
    isNullable: true,
    typeName: "Enum",
    name: "enumList"
  },
  nonNullListEnum: {
    isList: true,
    isNullableList: false,
    isEnum: true,
    scalar: null,
    isNullable: true,
    typeName: "Enum",
    name: "nonNullListEnum"
  },
  nonNullListNonNullEnum: {
    isList: true,
    isNullableList: false,
    isEnum: true,
    scalar: null,
    isNullable: false,
    typeName: "Enum",
    name: "nonNullListNonNullEnum"
  },
  object: {
    isList: false,
    isNullableList: false,
    isEnum: false,
    scalar: null,
    isNullable: true,
    typeName: "TestType",
    name: "object"
  },
  nonNullObject: {
    isList: false,
    isNullableList: false,
    isEnum: false,
    scalar: null,
    isNullable: false,
    typeName: "TestType",
    name: "nonNullObject"
  },
  objectList: {
    isList: true,
    isNullableList: true,
    isEnum: false,
    scalar: null,
    isNullable: true,
    typeName: "TestType",
    name: "objectList"
  },
  nonNullListObject: {
    isList: true,
    isNullableList: false,
    isEnum: false,
    scalar: null,
    isNullable: true,
    typeName: "TestType",
    name: "nonNullListObject"
  },
  nonNullListNonNullObject: {
    isList: true,
    isNullableList: false,
    isEnum: false,
    scalar: null,
    isNullable: false,
    typeName: "TestType",
    name: "nonNullListNonNullObject"
  },
  nullListNonNullScalar: {
    isList: true,
    isNullableList: true,
    isEnum: false,
    scalar: "string",
    isNullable: false,
    typeName: "String",
    name: "nullListNonNullScalar"
  },
  nullListNonNullEnum: {
    isList: true,
    isNullableList: true,
    isEnum: true,
    scalar: null,
    isNullable: false,
    typeName: "Enum",
    name: "nullListNonNullEnum"
  },
  nullListNonNullObject: {
    isList: true,
    isNullableList: true,
    isEnum: false,
    scalar: null,
    isNullable: false,
    typeName: "TestType",
    name: "nullListNonNullObject"
  }
};

const astNode = parse(schema);
const firstDefNode = astNode.definitions[0];
const secondDefNode = astNode.definitions[1];
const fields = isObjectTypeDefinition(firstDefNode)
  ? firstDefNode.fields || []
  : [];

const enums = isEnumTypeDefinition(secondDefNode) ? [secondDefNode] : [];

describe("utils", () => {
  describe("getReasonFieldType", () => {
    test.each`
      field                         | enums    | expected
      ${"scalarString"}             | ${enums} | ${"option(string)"}
      ${"nonNullScalar"}            | ${enums} | ${"string"}
      ${"scalarList"}               | ${enums} | ${"option(array(option(string)))"}
      ${"nonNullListScalar"}        | ${enums} | ${"array(option(string))"}
      ${"nonNullListNonNullScalar"} | ${enums} | ${"array(string)"}
      ${"enum"}                     | ${enums} | ${"option(enum_enum)"}
      ${"nonNullEnum"}              | ${enums} | ${"enum_enum"}
      ${"enumList"}                 | ${enums} | ${"option(array(option(enum_enum)))"}
      ${"nonNullListEnum"}          | ${enums} | ${"array(option(enum_enum))"}
      ${"nonNullListNonNullEnum"}   | ${enums} | ${"array(enum_enum)"}
      ${"object"}                   | ${enums} | ${"option(testType)"}
      ${"nonNullObject"}            | ${enums} | ${"testType"}
      ${"objectList"}               | ${enums} | ${"option(array(option(testType)))"}
      ${"nonNullListObject"}        | ${enums} | ${"array(option(testType))"}
      ${"nonNullListNonNullObject"} | ${enums} | ${"array(testType)"}
      ${"nullListNonNullScalar"}    | ${enums} | ${"option(array(string))"}
      ${"nullListNonNullEnum"}      | ${enums} | ${"option(array(enum_enum))"}
      ${"nullListNonNullObject"}    | ${enums} | ${"option(array(testType))"}
    `(
      "returns $expected given graphql type $field",
      ({ field, enums, expected }) => {
        const foundField = fields.find(f => f.name.value === field);
        if (!foundField) {
          throw new Error(`${field} was not found in fixture`);
        }
        expect(
          getReasonFieldType(
            getFieldTypeDetails(defaultScalarMap, enums)(foundField)
          )
        ).toEqual(expected);
      }
    );
  });

  describe("getFieldTypeDetails", () => {
    test.each`
      field                         | enums
      ${"scalarString"}             | ${enums}
      ${"nonNullScalar"}            | ${enums}
      ${"scalarList"}               | ${enums}
      ${"nonNullListScalar"}        | ${enums}
      ${"nonNullListNonNullScalar"} | ${enums}
      ${"enum"}                     | ${enums}
      ${"nonNullEnum"}              | ${enums}
      ${"enumList"}                 | ${enums}
      ${"nonNullListEnum"}          | ${enums}
      ${"nonNullListNonNullEnum"}   | ${enums}
      ${"object"}                   | ${enums}
      ${"nonNullObject"}            | ${enums}
      ${"nonNullListObject"}        | ${enums}
      ${"objectList"}               | ${enums}
      ${"nonNullListNonNullObject"} | ${enums}
      ${"nullListNonNullScalar"}    | ${enums}
      ${"nullListNonNullEnum"}      | ${enums}
      ${"nullListNonNullObject"}    | ${enums}
    `("returns correct details for graphql type $field", ({ field, enums }) => {
      const foundField = fields.find(f => f.name.value === field);
      if (!foundField) {
        throw new Error(`${field} was not found in fixture`);
      }
      const expected = detailsMap[field] || {};
      expect(getFieldTypeDetails(defaultScalarMap, enums)(foundField)).toEqual(
        expected
      );
    });
  });
});
