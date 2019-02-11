import {
  PluginFunction,
  DocumentFile,
  schemaToTemplateContext
} from "graphql-codegen-core";
import { GraphQLSchema } from "graphql";
import { camelCase } from "lodash";
import { parseRE, printRE } from "reason";

import { rootTemplate } from "./root";

export interface ReasonConfig {
  scalars?: { [scalarName: string]: string };
}

const refmt = (str: string) => printRE(parseRE(str));

const writeTypeDef = (typename: string) => {
  const suffix = typename === "Query" ? " = Js.Json.t;" : ";";
  return `type ${camelCase(typename)}${suffix}`;
};

export const plugin: PluginFunction<ReasonConfig> = async (
  schema: GraphQLSchema,
  documents: DocumentFile[],
  config: ReasonConfig
) => {
  const templateContext = schemaToTemplateContext(schema);

  return rootTemplate(templateContext, config);
};
