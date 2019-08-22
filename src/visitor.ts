import { ReasonConfig } from ".";
import {
  VisitFn,
  ASTNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  EnumTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  OperationDefinitionNode
} from "graphql";
import { camelCase, capitalize, uniq } from "lodash";
import {
  sanitizeFieldName,
  getReasonFieldType,
  getFieldTypeDetails,
  defaultScalarMap,
  IObjectType,
  IInputType,
  IField,
  writeInputObjectFieldTypes,
  transforms,
  writeInputModule,
  IOperationType
} from "./utils";
import { head } from "./head";
import {
  writeOperationsFromDocuments,
  extractDocumentOperations
} from "./documents";
import { Types } from "@graphql-codegen/plugin-helpers";

const writeCustomScalars = (config: ReasonConfig) => {
  const scalars = config.scalars || {};
  return Object.keys(scalars)
    .map(scalar => `type ${camelCase(scalar)} = ${scalars[scalar]};`)
    .join("\n");
};

const writeEnumMap = (node: EnumTypeDefinitionNode) => {
  const typeName = transforms.enum(node.name.value);
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
type ${transforms.enum(node.name.value)} = [ ${values}];

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
  const fields = writeInputObjectFieldTypes(node.fieldDetails);

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
          ~decoder=${transforms.enum(typeName)}FromJs,
        )`);
    } else {
      args.push(`~decoder=${transforms.enum(typeName)}FromJs`);
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
  let ${sanitizeFieldName(node.name)}: field(t, ${getReasonFieldType(node, [
    [node => node.isEnum, transforms.enum],
    [node => !node.isEnum && !node.scalar, camelCase],
    [node => node.isNullable, transforms.option],
    [node => node.isList, transforms.array],
    [node => node.isNullableList, transforms.option]
  ])}) = ${fieldGetter(node)};`;
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

const writeInputTypeModule = (node: IInputType) =>
  writeInputModule(
    node.fieldDetails,
    node.name.value,
    camelCase(node.name.value),
    "t",
    "make"
  );

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
  const write = (documents: Types.DocumentFile[]) => {
    const scalarMap = {
      ...defaultScalarMap,
      ...config.scalars
    };
    const operations = extractDocumentOperations(documents, scalarMap, enums);
    const getDetails = getFieldTypeDetails(scalarMap, enums);
    const objectsWithDetails = objects.map(obj => ({
      ...obj,
      fieldDetails: obj.fields
        ? obj.fields.map(node => getDetails(node.type, node.name.value))
        : []
    }));

    const inputObjectsWithDetails = inputObjects.map(obj => ({
      ...obj,
      fieldDetails: obj.fields
        ? obj.fields.map(node => getDetails(node.type, node.name.value))
        : []
    }));

    const filteredInputObjects = config.filterInputTypes
      ? filterInputObjects(inputObjectsWithDetails, operations)
      : inputObjectsWithDetails;

    const inputObjectTypeDefs =
      (filteredInputObjects.length &&
        `type ${filteredInputObjects.map(writeInputType).join(" and \n")};`) ||
      "";

    return `
    ${head}
    ${writeCustomScalars(config)}
    ${enums.map(writeEnumType).join("\n")}
    ${objectsWithDetails.map(writeObjectType).join("\n")}
    ${inputObjectTypeDefs}
    ${objectsWithDetails.map(writeObjectModule).join("\n")}
    ${filteredInputObjects.map(writeInputTypeModule).join("\n")}
    ${writeOperationsFromDocuments(operations)}
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
