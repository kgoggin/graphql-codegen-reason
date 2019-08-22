import { PluginFunction, Types } from "@graphql-codegen/plugin-helpers";
import { GraphQLSchema, printSchema, parse, visit } from "graphql";
import { parseRE, printRE } from "reason";
import { makeVisitor } from "./visitor";

export interface ReasonConfig {
  scalars?: { [scalarName: string]: string };
  refmt?: boolean;
  filterInputTypes?: boolean;
}

const refmt = (str: string) => printRE(parseRE(str));

const defaultConfig = {
  scalars: {},
  refmt: true,
  filterInputTypes: false
};

export const plugin: PluginFunction<ReasonConfig> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  c: ReasonConfig
) => {
  const printedSchema = printSchema(schema);
  const astNode = parse(printedSchema);
  const config = { ...defaultConfig, ...c };
  const visitor = makeVisitor(config);

  visit(astNode, {
    leave: visitor
  });

  const result = visitor.write(documents);

  return config.refmt ? refmt(result) : result;
};
