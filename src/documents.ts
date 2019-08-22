import { Types } from "@graphql-codegen/plugin-helpers";
import {
  isOperationDefinitionNode,
  writeInputObjectFieldTypes,
  IField,
  writeInputArg,
  getFieldTypeDetails,
  ScalarMap,
  writeInputModule,
  IOperationType
} from "./utils";
import { OperationDefinitionNode, EnumTypeDefinitionNode } from "graphql";
import { camelCase, upperFirst } from "lodash";

const writeArgumentsMakeFn = (fieldDetails: IField[]) => {
  const args = fieldDetails.map(writeInputArg).join(", ") + ", unit";
  return `[@bs.obj] external makeVariables: (${args}) => variables = "";`;
};

const writeOperation = (node: IOperationType) => {
  return writeInputModule(
    node.variableFieldDetails,
    upperFirst(camelCase((node.name && node.name.value) || "")),
    `{
    .
    ${writeInputObjectFieldTypes(node.variableFieldDetails)}
  }`,
    "variables",
    "makeVariables"
  );
};

export const extractDocumentOperations = (
  documents: Types.DocumentFile[],
  scalarMap: ScalarMap,
  enums: EnumTypeDefinitionNode[]
): IOperationType[] => {
  const defs: OperationDefinitionNode[] = [];
  documents.forEach(file => {
    file.content.definitions.forEach(def => {
      if (isOperationDefinitionNode(def)) {
        defs.push(def);
      }
    });
  });
  return defs.map(node => {
    const details =
      (node.variableDefinitions &&
        node.variableDefinitions.map(def =>
          getFieldTypeDetails(scalarMap, enums)(
            def.type,
            def.variable.name.value
          )
        )) ||
      [];
    return {
      ...node,
      variableFieldDetails: details
    };
  });
};

export const writeOperationsFromDocuments = (operations: IOperationType[]) => {
  let queries: string[] = [];
  let mutations: string[] = [];
  operations.forEach(def => {
    const operation = writeOperation(def);
    if (def.operation === "query") {
      queries.push(operation);
    } else if (def.operation === "mutation") {
      mutations.push(operation);
    }
  });

  return `
  module Queries = {
    ${queries.join("\n")}
  };

  module Mutations = {
    ${mutations.join("\n")}
  }
  `;
};
