import {
  VisitFn,
  ASTNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  EnumTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  OperationDefinitionNode,
  FragmentDefinitionNode,
  TypeNode,
  NamedTypeNode,
  ListTypeNode,
  NonNullTypeNode,
  DefinitionNode,
} from 'graphql';
import { uniq, camelCase } from 'lodash';
import { Types } from '@graphql-codegen/plugin-helpers';
import { printRE, parseRE } from 'reason';

export interface BaseReasonConfig {
  scalars?: { [scalarName: string]: string };
  refmt?: boolean;
  filterInputTypes?: boolean;
}

export const defaultBaseConfig = {
  scalars: {},
  refmt: true,
  filterInputTypes: false,
};

export declare type LoadedFragment<AdditionalFields = {}> = {
  name: string;
  onType: string;
  node: FragmentDefinitionNode;
  isExternal: boolean;
  importFrom?: string | null;
} & AdditionalFields;

export interface ISchemaData {
  enums: EnumTypeDefinitionNode[];
  scalarMap: ScalarMap;
  objects: IObjectType[];
  inputObjects: IInputType[];
  operations: IOperationType[];
}

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

export interface IOperationType extends OperationDefinitionNode {
  variableFieldDetails: IField[];
}

// type guards
export const isNamedTypeNode = (node: TypeNode): node is NamedTypeNode => {
  return (node as NamedTypeNode).kind === 'NamedType';
};

export const isListTypeNode = (node: TypeNode): node is ListTypeNode => {
  return (node as ListTypeNode).kind === 'ListType';
};

export const isNonNullTypeNode = (node: TypeNode): node is NonNullTypeNode => {
  return (node as NonNullTypeNode).kind === 'NonNullType';
};

export const isOperationDefinitionNode = (
  node: DefinitionNode
): node is OperationDefinitionNode => {
  return (node as OperationDefinitionNode).kind === 'OperationDefinition';
};

export const defaultScalarMap: ScalarMap = {
  String: 'string',
  Int: 'int',
  Float: 'float',
  Boolean: 'bool',
  ID: 'string',
};

export const refmt = (str: string) => printRE(parseRE(str));

export const transforms = {
  option: (str: string) => `option(${str})`,
  array: (str: string) => `array(${str})`,
  nullable: (str: string) => `Js.Nullable.t(${str})`,
  enum: (str: string) => camelCase(str) + '_enum',
  optionalArg: (str: string) => `${str}=?`,
};

const extractDocumentOperations = (
  documents: Types.DocumentFile[],
  scalarMap: ScalarMap,
  enums: EnumTypeDefinitionNode[]
): IOperationType[] => {
  return documents.reduce((prev: IOperationType[], file) => {
    let operations = file.content.definitions.reduce(
      (prevOperations: IOperationType[], def) => {
        if (isOperationDefinitionNode(def)) {
          const details =
            (def.variableDefinitions &&
              def.variableDefinitions.map(node =>
                getFieldTypeDetails(scalarMap, enums)(
                  node.type,
                  node.variable.name.value
                )
              )) ||
            [];
          return [
            ...prevOperations,
            {
              ...def,
              variableFieldDetails: details,
            },
          ];
        }
        return prevOperations;
      },
      []
    );
    return [...prev, ...operations];
  }, []);
};

const filterInputObjects = (
  inputObjects: IInputType[],
  operations: IOperationType[]
) => {
  const isObjectType = (field: IField) => !field.isEnum && !field.scalar;

  // first we parse out the input types that get referenced
  // in any of the operations
  const utilizedInputTypes: string[] = operations.reduce(
    (prev: string[], operation) => {
      const types = operation.variableFieldDetails
        .filter(isObjectType)
        .map(field => field.typeName);
      return [...prev, ...types];
    },
    []
  );
  const uniqueInputTypesInDocuments = uniq(utilizedInputTypes);

  // now we need to parse though those to make sure we include
  // any of the types they themselves reference

  const finalInputTypes: string[] = [];

  let getInputTypeDependency = (typeName: string) => {
    finalInputTypes.push(typeName);
    const type = inputObjects.find(node => node.name.value === typeName);
    const dependentTypes =
      (type && type.fieldDetails.filter(isObjectType)) || [];
    dependentTypes.forEach(node => {
      if (!finalInputTypes.includes(node.typeName)) {
        getInputTypeDependency(node.typeName);
      }
    });
  };

  uniqueInputTypesInDocuments.forEach(getInputTypeDependency);

  return inputObjects.filter(node => finalInputTypes.includes(node.name.value));
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

    return '';
  };
  const typeName = loop(type);
  return {
    name,
    typeName,
    isNullable,
    isEnum: enums.find(e => e.name.value === typeName) ? true : false,
    scalar: scalarMap[typeName] || null,
    isList,
    isNullableList,
  };
};

const reservedWords = ['type', 'and', 'or', 'class', 'end'];
export const sanitizeFieldName = (fieldName: string) => {
  const camel = camelCase(fieldName);
  if (reservedWords.includes(camel)) {
    return camel + '_';
  }

  return camel;
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

export const getReasonInputFieldValue = (node: IField) => {
  let underlyingValue = '';
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
    node.isNullable || node.isNullableList ? '->Js.Nullable.fromOption' : '';

  return `${underlyingValue}${optDecode}`;
};

const writeInputField = (node: IField) => {
  return `"${sanitizeFieldName(node.name)}": ${getReasonInputFieldValue(node)}`;
};

export const writeInputArg = (node: IField) => {
  return `~${sanitizeFieldName(node.name)}: ${getReasonFieldType(node, [
    [node => node.isEnum, transforms.enum],
    [node => !node.isEnum && !node.scalar, camelCase],
    [node => node.isNullable, transforms.option],
    [node => node.isList, transforms.array],
    [node => node.isNullableList, transforms.option],
    [node => node.isNullableList || node.isNullable, transforms.optionalArg],
  ])}`;
};

export const writeInputModule = (
  fieldDetails: IField[],
  moduleName: string,
  typeDef: string,
  typeName: string,
  makeFnName: string,
  additionalContent = ''
) => {
  let args =
    (fieldDetails.length &&
      fieldDetails.map(writeInputArg).join(', ') + ', ()') ||
    '';
  let fields =
    (fieldDetails.length &&
      `{
    ${fieldDetails.map(writeInputField).join(',')}
}`) ||
    '()';
  return `module ${moduleName} = {
    type ${typeName} = ${(fieldDetails.length && typeDef) || 'unit'};
    let ${makeFnName} = (${args}) => ${fields};
    ${additionalContent}
  };`;
};

export const writeInputObjectFieldTypes = (fields: IField[]) =>
  fields
    .map(
      field =>
        `"${sanitizeFieldName(field.name)}": ${getReasonFieldType(field, [
          [node => node.isEnum, () => 'string'],
          [node => !node.isEnum && !node.scalar, camelCase],
          [node => node.isNullable, transforms.nullable],
          [node => node.isList, transforms.array],
          [node => node.isNullableList, transforms.nullable],
        ])}`
    )
    .join(',\n');

export const makeVisitor = (
  config: BaseReasonConfig,
  writeFn: (data: ISchemaData) => string
) => {
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
  const write = (
    documents: Types.DocumentFile[]
    // fragments: LoadedFragment[]
  ) => {
    const scalarMap = {
      ...defaultScalarMap,
      ...config.scalars,
    };
    const operations = extractDocumentOperations(documents, scalarMap, enums);
    const getDetails = getFieldTypeDetails(scalarMap, enums);
    const objectsWithDetails = objects.map(obj => ({
      ...obj,
      fieldDetails: obj.fields
        ? obj.fields.map(node => getDetails(node.type, node.name.value))
        : [],
    }));

    const inputObjectsWithDetails = inputObjects.map(obj => ({
      ...obj,
      fieldDetails: obj.fields
        ? obj.fields.map(node => getDetails(node.type, node.name.value))
        : [],
    }));

    const filteredInputObjects = config.filterInputTypes
      ? filterInputObjects(inputObjectsWithDetails, operations)
      : inputObjectsWithDetails;

    const data = {
      enums,
      scalarMap,
      objects: objectsWithDetails,
      inputObjects: filteredInputObjects,
      operations,
    };

    return writeFn(data);
  };

  return {
    ObjectTypeDefinition: visitObjectTypeDefinition,
    ScalarTypeDefinition: visitScalarDefinition,
    EnumTypeDefinition: visitEnumTypeDefinition,
    InputObjectTypeDefinition: visitInputObjectTypeDefinition,
    write,
  };
};
