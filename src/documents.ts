import { Types } from "@graphql-codegen/plugin-helpers";
import {
  isOperationDefinitionNode,
  writeInputObjectFieldTypes,
  IField,
  writeInputArg,
  getFieldTypeDetails,
  ScalarMap,
  writeInputModule
} from "./utils";
import { OperationDefinitionNode, EnumTypeDefinitionNode } from "graphql";
import { camelCase, upperFirst } from "lodash";

const writeArgumentsMakeFn = (fieldDetails: IField[]) => {
  const args = fieldDetails.map(writeInputArg).join(", ") + ", unit";
  return `[@bs.obj] external makeVariables: (${args}) => variables = "";`;
};

const writeOperation = (
  node: OperationDefinitionNode,
  scalarMap: ScalarMap,
  enums: EnumTypeDefinitionNode[]
) => {
  const details =
    (node.variableDefinitions &&
      node.variableDefinitions.map(def =>
        getFieldTypeDetails(scalarMap, enums)(def.type, def.variable.name.value)
      )) ||
    [];

  return writeInputModule(
    details,
    upperFirst(camelCase((node.name && node.name.value) || "")),
    `{
    .
    ${writeInputObjectFieldTypes(details)}
  }`,
    "variables",
    "makeVariables"
  );
};

export const writeOperationsFromDocuments = (
  documnents: Types.DocumentFile[],
  scalarMap: ScalarMap,
  enums: EnumTypeDefinitionNode[]
) => {
  let queries: string[] = [];
  let mutations: string[] = [];
  documnents.forEach(file => {
    file.content.definitions.forEach(def => {
      if (isOperationDefinitionNode(def)) {
        const operation = writeOperation(def, scalarMap, enums);
        if (def.operation === "query") {
          queries.push(operation);
        } else if (def.operation === "mutation") {
          mutations.push(operation);
        }
      }
    });
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
