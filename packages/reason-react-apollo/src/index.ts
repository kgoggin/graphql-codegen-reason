import { PluginFunction, Types } from '@graphql-codegen/plugin-helpers';
import {
  BaseReasonConfig,
  LoadedFragment,
  makeVisitor,
  ISchemaData,
  refmt,
  IOperationType,
  ScalarMap,
  isOperationDefinitionNode,
  getFieldTypeDetails,
  writeInputObjectFieldTypes,
  defaultBaseConfig,
  makeMakeVariables,
} from 'graphql-codegen-reason-base';
import gqlTag from 'graphql-tag';
import {
  print,
  printSchema,
  parse,
  concatAST,
  DocumentNode,
  FragmentDefinitionNode,
  visit,
  Kind,
  GraphQLSchema,
  FragmentSpreadNode,
  EnumTypeDefinitionNode,
} from 'graphql';
import { upperFirst, camelCase, capitalize } from 'lodash';

export interface ReasonReactApolloConfig extends BaseReasonConfig {
  graphqlTypesModuleName: string;
  documentNodeTypeName?: string;
}

const extractFragments = (document: IOperationType): string[] => {
  if (!document) {
    return [];
  }

  const names: string[] = [];

  visit(document, {
    enter: {
      FragmentSpread: (node: FragmentSpreadNode) => {
        names.push(node.name.value);
      },
    },
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
      .join('\n')}`;
  }

  return '';
};

const writeDocumentNode = (
  node: IOperationType,
  fragments: LoadedFragment[],
  config: ReasonReactApolloConfig
) => {
  const doc = `${print(node)}
  ${includeFragments(transformFragments(node), fragments)}`;
  const gqlObj = gqlTag(doc);
  if (gqlObj && gqlObj['loc']) {
  }
  delete gqlObj.loc;
  return `let ${node.operation}: ${
    config.documentNodeTypeName
  } = [%raw {|${JSON.stringify(gqlObj)}|}];`;
};

const writeOperation = (
  node: IOperationType,
  fragments: LoadedFragment[],
  config: ReasonReactApolloConfig
) => {
  const functorName = `Make${capitalize(node.operation)}`;
  const moduleName = upperFirst(
    camelCase((node.name && node.name.value) || '')
  );
  const typeDef = node.variableFieldDetails.length
    ? `{
    .
    ${writeInputObjectFieldTypes(node.variableFieldDetails)}
  }`
    : 'unit';
  return `module ${moduleName} = {
    include ${functorName}({
      type variables = ${typeDef};
      let parse = toJSON;
      ${writeDocumentNode(node, fragments, config)}
    });

    ${makeMakeVariables(node.variableFieldDetails, 'makeVariables')}
  }`;
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

export const writeOperationsFromDocuments = (
  operations: IOperationType[],
  fragments: LoadedFragment[],
  config: ReasonReactApolloConfig
) => {
  let queries: string[] = [];
  let mutations: string[] = [];
  operations.forEach(def => {
    const operation = writeOperation(def, fragments, config);
    if (def.operation === 'query') {
      queries.push(operation);
    } else if (def.operation === 'mutation') {
      mutations.push(operation);
    }
  });

  return `
  module Queries = {
    ${queries.join('\n')}
  };

  module Mutations = {
    ${mutations.join('\n')}
  }
  `;
};

const defaultConfig = {
  ...defaultBaseConfig,
  documentNodeTypeName: 'documentNode',
};

export const plugin: PluginFunction<ReasonReactApolloConfig> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  c: ReasonReactApolloConfig
) => {
  const printedSchema = printSchema(schema);
  const astNode = parse(printedSchema);
  const config = { ...defaultConfig, ...c };
  const allAst = concatAST(
    documents.reduce((prev: DocumentNode[], v) => {
      return [...prev, v.content];
    }, [])
  );

  const allFragments: LoadedFragment[] = [
    ...(allAst.definitions.filter(
      d => d.kind === Kind.FRAGMENT_DEFINITION
    ) as FragmentDefinitionNode[]).map(fragmentDef => ({
      node: fragmentDef,
      name: fragmentDef.name.value,
      onType: fragmentDef.typeCondition.name.value,
      isExternal: false,
    })),
    ...[],
  ];

  const visitor = makeVisitor(config, (data: ISchemaData) => {
    return `
    include ${config.graphqlTypesModuleName};

    include ReasonReactApollo.Project.Make({
      type query = Query.t;
      type mutation = Mutation.t;
      let parseQuery: Js.Json.t => query = fromJSON;
      let parseMutation: Js.Json.t => mutation = fromJSON;
    });

    ${writeOperationsFromDocuments(data.operations, allFragments, config)}`;
  });

  visit(astNode, { leave: visitor });
  const result = visitor.write(documents);

  return config.refmt ? refmt(result) : result;
};
