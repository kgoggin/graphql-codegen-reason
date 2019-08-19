import { PluginFunction, Types } from "@graphql-codegen/plugin-helpers";
import { GraphQLSchema, printSchema, parse, visit } from "graphql";
import { camelCase } from "lodash";
import { parseRE, printRE } from "reason";
import { makeVisitor } from "./visitor";

export interface ReasonConfig {
  scalars?: { [scalarName: string]: string };
}

const refmt = (str: string) => printRE(parseRE(str));

export const plugin: PluginFunction<ReasonConfig> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: ReasonConfig
) => {
  const printedSchema = printSchema(schema);
  const astNode = parse(printedSchema);

  const visitor = makeVisitor(config);

  visit(astNode, {
    leave: visitor
  });

  return visitor.write();
};
