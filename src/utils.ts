import { camelCase } from "lodash";
import {
  NamedTypeNode,
  TypeNode,
  ListTypeNode,
  NonNullTypeNode,
  EnumTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  DefinitionNode,
  OperationDefinitionNode
} from "graphql";

export interface ScalarMap {
  [key: string]: string;
}

export interface IField {
  isList: boolean;
  isNullableList: boolean;
  isEnum: boolean;
  scalar: string | null;
  isNullable: boolean;
  typeName: string;
  name: string;
}

export interface ITypeTransformers {
  listTransform: (str: string) => string;
  nullableListTransform: (str: string) => string;
  nullableTransform: (str: string) => string;
  enumTransform: (str: string) => string;
  scalarTransform: (str: string) => string;
  objectTransform: (str: string) => string;
}

export interface IObjectType extends ObjectTypeDefinitionNode {
  fieldDetails: IField[];
}

export interface IInputType extends InputObjectTypeDefinitionNode {
  fieldDetails: IField[];
}

export interface IOperationType extends OperationDefinitionNode {
  variableFieldDetails: IField[];
}

export const defaultScalarMap: ScalarMap = {
  String: "string",
  Int: "int",
  Float: "float",
  Boolean: "bool",
  ID: "string"
};

export const transforms = {
  option: (str: string) => `option(${str})`,
  array: (str: string) => `array(${str})`,
  nullable: (str: string) => `Js.Nullable.t(${str})`,
  enum: (str: string) => camelCase(str) + "_enum",
  optionalArg: (str: string) => `${str}=?`
};

export const composeTransforms = (transforms: ((str: string) => string)[]) => {
  return (str: string) =>
    transforms.reduce((prev, current) => current(prev), str);
};

export const getReasonFieldType = (
  node: IField,
  transformers: [(node: IField) => boolean, (str: string) => string][]
): string => {
  return transformers.reduce((prev, current) => {
    const [predicate, transform] = current;
    return predicate(node) ? transform(prev) : prev;
  }, node.scalar || node.typeName);
};

const reservedWords = ["type", "and", "or", "class", "end"];

export const sanitizeFieldName = (fieldName: string) => {
  const camel = camelCase(fieldName);
  if (reservedWords.includes(camel)) {
    return camel + "_";
  }

  return camel;
};

// type guards
export const isNamedTypeNode = (node: TypeNode): node is NamedTypeNode => {
  return (node as NamedTypeNode).kind === "NamedType";
};

export const isListTypeNode = (node: TypeNode): node is ListTypeNode => {
  return (node as ListTypeNode).kind === "ListType";
};

export const isNonNullTypeNode = (node: TypeNode): node is NonNullTypeNode => {
  return (node as NonNullTypeNode).kind === "NonNullType";
};

export const isOperationDefinitionNode = (
  node: DefinitionNode
): node is OperationDefinitionNode => {
  return (node as OperationDefinitionNode).kind === "OperationDefinition";
};

export const getFieldTypeDetails = (
  scalarMap: ScalarMap,
  enums: EnumTypeDefinitionNode[]
) => (type: TypeNode, name: string): IField => {
  let isList = false;
  let isNullableList = false;
  let isNullable = true;

  const loop = (type: TypeNode, parent?: TypeNode): string => {
    if (isListTypeNode(type)) {
      isList = true;
      isNullableList = parent ? !isNonNullTypeNode(parent) : true;
      return loop(type.type, type);
    }

    if (isNamedTypeNode(type)) {
      isNullable = parent ? !isNonNullTypeNode(parent) : true;
      return type.name.value;
    }

    if (isNonNullTypeNode(type)) {
      return loop(type.type, type);
    }

    return "";
  };
  const typeName = loop(type);
  return {
    name,
    typeName,
    isNullable,
    isEnum: enums.find(e => e.name.value === typeName) ? true : false,
    scalar: scalarMap[typeName] || null,
    isList,
    isNullableList
  };
};

export const getReasonInputFieldValue = (node: IField) => {
  let underlyingValue = "";
  if (node.isEnum) {
    const encoder = `${transforms.enum(node.typeName)}ToJs`;
    let wrappedEncoder;
    if (node.isList) {
      wrappedEncoder = node.isNullableList
        ? `Belt.Option.map(Array.map(${encoder}))`
        : `Belt.Array.map(${encoder})`;
    } else {
      wrappedEncoder = node.isNullable
        ? `Belt.Option.map(${encoder})`
        : encoder;
    }
    underlyingValue = `${sanitizeFieldName(node.name)}->${wrappedEncoder}`;
  } else {
    underlyingValue = sanitizeFieldName(node.name);
  }

  let optDecode =
    node.isNullable || node.isNullableList ? "->Js.Nullable.fromOption" : "";

  return `${underlyingValue}${optDecode}`;
};

export const writeInputObjectFieldTypes = (fields: IField[]) =>
  fields
    .map(
      field =>
        `"${sanitizeFieldName(field.name)}": ${getReasonFieldType(field, [
          [node => node.isEnum, () => "string"],
          [node => !node.isEnum && !node.scalar, camelCase],
          [node => node.isNullable, transforms.nullable],
          [node => node.isList, transforms.array],
          [node => node.isNullableList, transforms.nullable]
        ])}`
    )
    .join(",\n");

export const writeInputArg = (node: IField) => {
  return `~${sanitizeFieldName(node.name)}: ${getReasonFieldType(node, [
    [node => node.isEnum, transforms.enum],
    [node => !node.isEnum && !node.scalar, camelCase],
    [node => node.isNullable, transforms.option],
    [node => node.isList, transforms.array],
    [node => node.isNullableList, transforms.option],
    [node => node.isNullableList || node.isNullable, transforms.optionalArg]
  ])}`;
};

const writeInputField = (node: IField) => {
  return `"${sanitizeFieldName(node.name)}": ${getReasonInputFieldValue(node)}`;
};

export const writeInputModule = (
  fieldDetails: IField[],
  moduleName: string,
  typeDef: string,
  typeName: string,
  makeFnName: string
) => {
  let args = fieldDetails.map(writeInputArg).join(", ") + ", ()";
  let fields = fieldDetails.map(writeInputField).join(",");
  return `module ${moduleName} = {
    type ${typeName} = ${typeDef};
    let ${makeFnName} = (${args}) => {
      ${fields}
    }
  };`;
};
