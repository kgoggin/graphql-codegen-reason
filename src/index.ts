import { PluginFunction, Types } from "@graphql-codegen/plugin-helpers";
import {
  GraphQLSchema,
  printSchema,
  parse,
  visit,
  concatAST,
  DocumentNode,
  FragmentDefinitionNode,
  Kind
} from "graphql";
import { parseRE, printRE } from "reason";
import { makeVisitor } from "./visitor";

export interface ReasonConfig {
  scalars?: { [scalarName: string]: string };
  refmt?: boolean;
  filterInputTypes?: boolean;
  documentNodeTypeName?: string;
}

export declare type LoadedFragment<AdditionalFields = {}> = {
  name: string;
  onType: string;
  node: FragmentDefinitionNode;
  isExternal: boolean;
  importFrom?: string | null;
} & AdditionalFields;

const refmt = (str: string) => printRE(parseRE(str));

const defaultConfig = {
  scalars: {},
  refmt: true,
  filterInputTypes: false,
  documentNodeTypeName: "Js.t('a)"
};

export const plugin: PluginFunction<ReasonConfig> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  c: ReasonConfig
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
      isExternal: false
    })),
    ...[]
  ];

  const visitor = makeVisitor(config);

  visit(astNode, {
    leave: visitor
  });

  const result = visitor.write(documents, allFragments);

  return config.refmt ? refmt(result) : result;
};
