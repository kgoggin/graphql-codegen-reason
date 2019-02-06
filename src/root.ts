import {
  SchemaTemplateContext,
  Enum,
  EnumValue,
  Type,
  Field,
  FieldType
} from "graphql-codegen-core";
import { camelCase, capitalize } from "lodash";

import { head } from "./head";
import { sanitizeFieldName, ScalarMap, makeEnumTypeName } from "./utils";
import { writeInputTypeDefs, writeInputModule } from "./input";
import { ReasonConfig } from ".";

const makeCustomScalarTypeName = (name: string) => {
  return camelCase(name);
};

const writeCustomScalars = (scalars: { [scalarName: string]: string }) => {
  return Object.keys(scalars).map(
    scalar => `type ${makeCustomScalarTypeName(scalar)} = ${scalars[scalar]};`
  ).join(`
  `);
};

const writeEnumType = (type: Enum) => {
  const values = type.values.map(({ value }) => `| \`${value} `).join("");
  return `
[@bs.deriving jsConverter]
type ${makeEnumTypeName(type.name)} = [ ${values}];
`;
};

const writeObjectTypeDef = (type: Type) => {
  const querydef = type.name === "Query" ? ` = Js.Json.t` : "";
  return `type ${camelCase(type.name)}${querydef};`;
};

const scalarMap: ScalarMap = {
  String: "string",
  Int: "float",
  Float: "float",
  Boolean: "bool",
  ID: "string"
};

const getReasonFieldType = (field: Field, scalarMap: ScalarMap) => {
  let underlyingType = "";
  switch (field.fieldType) {
    case "Enum":
      underlyingType = makeEnumTypeName(field.type);
      break;
    case "Type":
    case "InputType":
      underlyingType = camelCase(field.type);
      break;
    case "Scalar":
      underlyingType = scalarMap[field.type];
      break;
    default:
      throw new Error(
        `Fields of type ${field.fieldType} are not currently supported`
      );
  }

  if (field.isArray) {
    const arrayType = field.isNullableArray
      ? `option(${underlyingType})`
      : underlyingType;

    return field.isRequired
      ? `array(${arrayType})`
      : `option(array(${arrayType}))`;
  } else {
    return field.isRequired ? underlyingType : `option(${underlyingType})`;
  }
};

const fieldGetter = (field: Field, scalarMap: ScalarMap) => {
  const args = [`~fieldName="${field.name}"`, `~typeName`];
  if (field.isEnum) {
    if (field.isArray) {
      args.push(`~decoder=
        decodeEnum(
          ~fieldName="${field.name}",
          ~typeName,
          ~decoder=${makeEnumTypeName(field.type)}FromJs,
        )`);
    } else {
      args.push(`~decoder=${makeEnumTypeName(field.type)}FromJs`);
    }
  }

  let methodName: string = "";

  if (field.isArray) {
    methodName = "Array";
  } else {
    switch (field.fieldType) {
      case "Enum":
        methodName = "Enum";
        break;
      case "Scalar":
        const name = scalarMap[field.type];
        methodName = capitalize(name);
        break;
      case "Type":
      case "InputType":
        methodName = "Field";
        break;
      default:
        throw new Error(
          `Fields of type ${field.fieldType} are not currently supported.`
        );
    }
  }

  const nullableStr = field.isRequired ? "" : "Nullable";

  return `get${nullableStr}${methodName}(${args.join(", ")})`;
};

const writeObjectField = (field: Field, scalarMap: ScalarMap) => {
  return `
  let ${sanitizeFieldName(field.name)}: field(t, ${getReasonFieldType(
    field,
    scalarMap
  )}) = ${fieldGetter(field, scalarMap)};`;
};

const writeObjectModule = (type: Type, scalarMap: ScalarMap) => {
  const fields = type.fields
    .map(field => writeObjectField(field, scalarMap))
    .join("");
  return `module ${type.name} = {
    type t = ${camelCase(type.name)};
    let typeName = "${type.name}";
    ${fields}
  };`;
};

export const rootTemplate = (
  context: SchemaTemplateContext,
  config: ReasonConfig
) => {
  const customScalarDefs = config.scalars
    ? writeCustomScalars(config.scalars)
    : "";

  const finalScalarMap = config.scalars
    ? {
        ...scalarMap,
        ...config.scalars
      }
    : scalarMap;
  const enumDefs = context.enums.map(writeEnumType).join(`
  `);
  const typeDefs = context.types.map(writeObjectTypeDef).join(`
  `);
  const inputTypeDefs = writeInputTypeDefs(context.inputTypes, finalScalarMap);
  const typeModules = context.types.map(type =>
    writeObjectModule(type, finalScalarMap)
  ).join(`
  `);

  console.log("------------------------------------------");
  console.log(finalScalarMap.DateTime);
  const inputModules = context.inputTypes.map(type =>
    writeInputModule(type, finalScalarMap)
  ).join(`
  `);

  return `
    ${head}
    ${customScalarDefs}
    ${enumDefs}
    ${typeDefs}
    ${inputTypeDefs}
    ${typeModules}
    ${inputModules}
  `;
};
