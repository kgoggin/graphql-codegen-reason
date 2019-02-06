import { Type, Field } from "graphql-codegen-core";
import { camelCase } from "lodash";

import { sanitizeFieldName, ScalarMap, makeEnumTypeName } from "./utils";

const getReasonFieldType = (field: Field, scalarMap: ScalarMap) => {
  let underlyingType = "";
  switch (field.fieldType) {
    case "Enum":
      underlyingType = "string";
      break;
    case "Type":
    case "InputType":
      underlyingType = camelCase(field.type);
      break;
    case "Scalar":
      underlyingType = scalarMap[field.type];
      // if (!scalarMap[field.type]) {
      //   console.log(field.type);
      //   console.log(scalarMap);
      // }
      break;
    default:
      throw new Error(
        `Fields of type ${field.fieldType} are not currently supported`
      );
  }

  if (field.isArray) {
    const arrayType = field.isNullableArray
      ? `Js.Nullable.t(${underlyingType})`
      : underlyingType;

    return field.isRequired
      ? `array(${arrayType})`
      : `Js.Nullable.t(array(${arrayType}))`;
  } else {
    return field.isRequired
      ? underlyingType
      : `Js.Nullable.t(${underlyingType})`;
  }
};

const getReasonFieldValue = (field: Field, scalarMap: ScalarMap) => {
  let underlyingValue = "";
  switch (field.fieldType) {
    case "Enum":
      const encoder = `${makeEnumTypeName(field.type)}ToJs`;
      let wrappedEncoder;
      if (field.isArray) {
        wrappedEncoder = field.isRequired
          ? `Belt.Array.map(${encoder})`
          : `Belt.Option.map(Array.map(${encoder}))`;
      } else {
        wrappedEncoder = field.isRequired
          ? encoder
          : `Belt.Option.map(${encoder})`;
      }
      underlyingValue = `${sanitizeFieldName(field.name)}->${wrappedEncoder}`;
      break;
    case "Type":
    case "InputType":
    case "Scalar":
      underlyingValue = sanitizeFieldName(field.name);
      break;
    default:
      throw new Error(
        `Fields of type ${field.fieldType} are not currently supported`
      );
  }

  // if (field.isArray) {
  //   return field.isNullableArray
  //     ? `${underlyingValue}->Js.Nullable.fromOption`
  //     : underlyingValue;
  // } else {

  // }

  return field.isRequired
    ? underlyingValue
    : `${underlyingValue}->Js.Nullable.fromOption`;
};

const writeInputTypeField = (field: Field, scalarMap: ScalarMap) => {
  return `"${sanitizeFieldName(field.name)}": ${getReasonFieldType(
    field,
    scalarMap
  )}`;
};

const writeInputTypeDef = (type: Type, scalarMap: ScalarMap) => {
  const fields = type.fields.map(field =>
    writeInputTypeField(field, scalarMap)
  );
  return `${camelCase(type.name)} = {
    .
    ${fields.join(`,
    `)}
  }`;
};

export const writeInputTypeDefs = (
  inputTypes: Type[],
  scalarMap: ScalarMap
) => {
  const typeDefs = inputTypes
    .map(types => writeInputTypeDef(types, scalarMap))
    .join(" and ");
  return `type ${typeDefs};`;
};

const writeInputArg = (field: Field) => {
  const optionString = field.isRequired ? "" : "=?";
  return `~${sanitizeFieldName(field.name)}${optionString}`;
};

const writeInputField = (field: Field, scalarMap: ScalarMap) => {
  return `"${sanitizeFieldName(field.name)}": ${getReasonFieldValue(
    field,
    scalarMap
  )}`;
};

export const writeInputModule = (type: Type, scalarMap: ScalarMap) => {
  let args = type.fields.map(writeInputArg).join(", ") + ", ()";
  let fields = type.fields.map(field => writeInputField(field, scalarMap));
  return `module ${type.name} = {
    type t = ${camelCase(type.name)};
    let make = (${args}): t => {
      ${fields}
    }
  };`;
};
