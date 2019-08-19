import { ReasonConfig } from ".";
import {
  VisitFn,
  ASTNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  EnumTypeDefinitionNode,
  InputObjectTypeDefinitionNode
} from "graphql";
import { camelCase, capitalize } from "lodash";
import {
  makeEnumTypeName,
  sanitizeFieldName,
  getReasonFieldType,
  getFieldTypeDetails,
  defaultScalarMap,
  IObjectType,
  IInputType,
  IField,
  getReasonInputFieldValue
} from "./utils";
import { head } from "./head";

const writeCustomScalars = (config: ReasonConfig) => {
  const scalars = config.scalars || {};
  return Object.keys(scalars)
    .map(scalar => `type ${camelCase(scalar)} = ${scalars[scalar]};`)
    .join("\n");
};

const writeEnumMap = (node: EnumTypeDefinitionNode) => {
  const typeName = makeEnumTypeName(node.name.value);
  return `
  let ${camelCase(node.name.value)}Map: enumMap(${typeName}) = {
    toString: ${typeName}ToJs,
    fromString: ${typeName}FromJs
  };
  `;
};

const writeEnumType = (node: EnumTypeDefinitionNode) => {
  const values = node.values
    ? node.values.map(({ name }) => `| \`${name.value} `).join("")
    : [];
  return `
[@bs.deriving jsConverter]
type ${makeEnumTypeName(node.name.value)} = [ ${values}];

${writeEnumMap(node)}
`;
};

const writeObjectType = (node: IObjectType) => {
  const querydef =
    node.name.value === "Query" || node.name.value === "Mutation"
      ? ` = Js.Json.t`
      : "";
  return `type ${camelCase(node.name.value)}${querydef};`;
};

const writeInputType = (node: IInputType) => {
  const fields = node.fieldDetails
    .map(
      field =>
        `"${sanitizeFieldName(field.name)}": ${getReasonFieldType(field, true)}`
    )
    .join(",\n");
  return `${camelCase(node.name.value)} = {
    .
    ${fields}
  }`;
};

const fieldGetter = (node: IField) => {
  const { isEnum, isList, typeName, isNullable, isNullableList, scalar } = node;

  const args = [`~fieldName="${node.name}"`, `~typename`];
  if (isEnum) {
    if (isList) {
      args.push(`~decoder=
        decodeEnum(
          ~fieldName="${node.name}",
          ~typename,
          ~decoder=${makeEnumTypeName(typeName)}FromJs,
        )`);
    } else {
      args.push(`~decoder=${makeEnumTypeName(typeName)}FromJs`);
    }
  }

  let methodName: string = "";

  if (isList) {
    methodName = isNullableList ? "NullableArray" : "Array";
  } else {
    if (isEnum) {
      methodName = "Enum";
    } else if (scalar) {
      methodName = capitalize(scalar);
    } else {
      methodName = "Field";
    }

    if (isNullable) {
      methodName = "Nullable" + methodName;
    }
  }
  return `get${methodName}(${args.join(", ")})`;
};

const writeObjectField = (node: IField) => {
  return `
  let ${sanitizeFieldName(node.name)}: field(t, ${getReasonFieldType(
    node
  )}) = ${fieldGetter(node)};`;
};

const writeObjectModule = (node: IObjectType) => {
  const fields = node.fieldDetails
    .map(field => writeObjectField(field))
    .join("");
  return `module ${node.name.value} = {
    type t = ${camelCase(node.name.value)};
    let typename = "${node.name.value}";
    ${fields}
  };`;
};

const writeInputArg = (node: IField) => {
  const optionString = node.isNullable || node.isNullableList ? "=?" : "";
  return `~${sanitizeFieldName(node.name)}${optionString}`;
};

const writeInputField = (node: IField) => {
  return `"${sanitizeFieldName(node.name)}": ${getReasonInputFieldValue(node)}`;
};

const writeInputModule = (node: IInputType) => {
  let args = node.fieldDetails.map(writeInputArg).join(", ") + ", ()";
  let fields = node.fieldDetails.map(writeInputField).join(",");
  return `module ${node.name.value} = {
    type t = ${camelCase(node.name.value)};
    let make = (${args}): t => {
      ${fields}
    }
  };`;
};

export const makeVisitor = (config: ReasonConfig) => {
  const scalars: ScalarTypeDefinitionNode[] = [];
  const objects: ObjectTypeDefinitionNode[] = [];
  const inputObjects: InputObjectTypeDefinitionNode[] = [];
  const enums: EnumTypeDefinitionNode[] = [];

  // visit functions
  const visitScalarDefinition: VisitFn<
    ASTNode,
    ScalarTypeDefinitionNode
  > = node => scalars.push(node);
  const visitObjectTypeDefinition: VisitFn<
    ASTNode,
    ObjectTypeDefinitionNode
  > = node => objects.push(node);
  const visitEnumTypeDefinition: VisitFn<
    ASTNode,
    EnumTypeDefinitionNode
  > = node => enums.push(node);
  const visitInputObjectTypeDefinition: VisitFn<
    ASTNode,
    InputObjectTypeDefinitionNode
  > = node => inputObjects.push(node);

  // write the result
  const write = () => {
    const scalarMap = {
      ...defaultScalarMap,
      ...config.scalars
    };
    const objectsWithDetails = objects.map(obj => ({
      ...obj,
      fieldDetails: obj.fields
        ? obj.fields.map(getFieldTypeDetails(scalarMap, enums))
        : []
    }));

    const inputObjectsWithDetails = inputObjects.map(obj => ({
      ...obj,
      fieldDetails: obj.fields
        ? obj.fields.map(getFieldTypeDetails(scalarMap, enums))
        : []
    }));

    return `
    ${head}
    ${writeCustomScalars(config)}
    ${enums.map(writeEnumType).join("\n")}
    ${objectsWithDetails.map(writeObjectType).join("\n")}
    type ${inputObjectsWithDetails.map(writeInputType).join(" and \n")};
    ${objectsWithDetails.map(writeObjectModule).join("\n")}
    ${inputObjectsWithDetails.map(writeInputModule).join("\n")}
    `;
  };

  return {
    ObjectTypeDefinition: visitObjectTypeDefinition,
    ScalarTypeDefinition: visitScalarDefinition,
    EnumTypeDefinition: visitEnumTypeDefinition,
    InputObjectTypeDefinition: visitInputObjectTypeDefinition,
    write
  };
};
