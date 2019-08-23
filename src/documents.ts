import { Types } from "@graphql-codegen/plugin-helpers";
import { relative } from "path";
import gqlTag from "graphql-tag";
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
import {
  OperationDefinitionNode,
  EnumTypeDefinitionNode,
  visit,
  print,
  FragmentSpreadNode
} from "graphql";
import { camelCase, upperFirst } from "lodash";
import { ReasonConfig, LoadedFragment } from ".";

const extractFragments = (document: IOperationType): string[] => {
  if (!document) {
    return [];
  }

  const names: string[] = [];

  visit(document, {
    enter: {
      FragmentSpread: (node: FragmentSpreadNode) => {
        names.push(node.name.value);
      }
    }
  });

  return names;
};

const transformFragments = (document: IOperationType): string[] => {
  return extractFragments(document).map(document => document);
};

const includeFragments = (
  fragments: string[],
  allFragments: LoadedFragment[]
): string => {
  if (fragments && fragments.length > 0) {
    return `${fragments
      .filter((name, i, all) => all.indexOf(name) === i)
      .map(name => {
        const found = allFragments.find(f => `${f.name}FragmentDoc` === name);

        if (found) {
          return print(found.node);
        }

        return null;
      })
      .filter(a => a)
      .join("\n")}`;
  }

  return "";
};

const writeDocumentNode = (
  node: IOperationType,
  fragments: LoadedFragment[],
  config: ReasonConfig
) => {
  const doc = `${print(node)}
  ${includeFragments(transformFragments(node), fragments)}`;
  const gqlObj = gqlTag(doc);
  if (gqlObj && gqlObj["loc"]) {
  }
  delete gqlObj.loc;
  return `let ${node.operation}: ${
    config.documentNodeTypeName
  } = [%raw {|${JSON.stringify(gqlObj)}|}];`;
};

const writeOperation = (
  node: IOperationType,
  fragments: LoadedFragment[],
  config: ReasonConfig
) => {
  return writeInputModule(
    node.variableFieldDetails,
    upperFirst(camelCase((node.name && node.name.value) || "")),
    `{
    .
    ${writeInputObjectFieldTypes(node.variableFieldDetails)}
  }`,
    "variables",
    "makeVariables",
    writeDocumentNode(node, fragments, config)
  );
};

export const extractDocumentOperations = (
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
              variableFieldDetails: details
            }
          ];
        }
        return prevOperations;
      },
      []
    );
    return [...prev, ...operations];
  }, []);
};

export const writeOperationsFromDocuments = (
  operations: IOperationType[],
  fragments: LoadedFragment[],
  config: ReasonConfig
) => {
  let queries: string[] = [];
  let mutations: string[] = [];
  operations.forEach(def => {
    const operation = writeOperation(def, fragments, config);
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
