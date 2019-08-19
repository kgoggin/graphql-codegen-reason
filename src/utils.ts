import { camelCase } from "lodash";
import {
  NamedTypeNode,
  TypeNode,
  ListTypeNode,
  NonNullTypeNode,
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  ObjectTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode
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

export interface IObjectType extends ObjectTypeDefinitionNode {
  fieldDetails: IField[];
}

export interface IInputType extends InputObjectTypeDefinitionNode {
  fieldDetails: IField[];
}

export const defaultScalarMap: ScalarMap = {
  String: "string",
  Int: "int",
  Float: "float",
  Boolean: "bool",
  ID: "string"
};

const reservedWords = ["type", "and", "or", "class", "end"];

export const sanitizeFieldName = (fieldName: string) => {
  const camel = camelCase(fieldName);
  if (reservedWords.includes(camel)) {
    return camel + "_";
  }

  return camel;
};

export const makeEnumTypeName = (name: string, isInputType = false) => {
  // in inputs types, enums are encoded as strings
  if (isInputType) {
    return "string";
  }

  // appending enum because GraphQL allows enums to share names with common types
  return camelCase(name) + "_enum";
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

export const getFieldTypeDetails = (
  scalarMap: ScalarMap,
  enums: EnumTypeDefinitionNode[]
) => (node: FieldDefinitionNode | InputValueDefinitionNode): IField => {
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
  const typeName = loop(node.type);
  return {
    name: node.name.value,
    typeName,
    isNullable,
    isEnum: enums.find(e => e.name.value === typeName) ? true : false,
    scalar: scalarMap[typeName] || null,
    isList,
    isNullableList
  };
};

export const getReasonFieldType = (
  node: IField,
  isInputType: boolean = false
): string => {
  let underlyingType = node.isEnum
    ? isInputType
      ? "string"
      : makeEnumTypeName(node.typeName)
    : node.scalar || camelCase(node.typeName);

  let nullableStr = isInputType ? "Js.Nullable.t" : "option";

  let nullableWrapper = (str: string) =>
    node.isNullable ? `${nullableStr}(${str})` : str;

  let listWrapper = (str: string) =>
    node.isList
      ? node.isNullableList
        ? `${nullableStr}(array(${str}))`
        : `array(${str})`
      : str;

  return listWrapper(nullableWrapper(underlyingType));
};

export const getReasonInputFieldValue = (node: IField) => {
  let underlyingValue = "";
  if (node.isEnum) {
    const encoder = `${makeEnumTypeName(node.typeName)}ToJs`;
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
