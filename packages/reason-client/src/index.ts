import { PluginFunction, Types } from '@graphql-codegen/plugin-helpers';
import {
  GraphQLSchema,
  printSchema,
  parse,
  visit,
  EnumTypeDefinitionNode,
} from 'graphql';
import {
  refmt,
  BaseReasonConfig,
  defaultBaseConfig,
  getReasonFieldType,
  makeVisitor,
  transforms,
  IField,
  IObjectType,
  IInputType,
  ISchemaData,
  sanitizeFieldName,
  writeInputModule,
} from 'graphql-codegen-reason-base';
import { head } from './head';
import { camelCase, capitalize } from 'lodash';

const writeCustomScalars = (config: BaseReasonConfig) => {
  const scalars = config.scalars || {};
  return Object.keys(scalars)
    .map(scalar => `type ${camelCase(scalar)} = ${scalars[scalar]};`)
    .join('\n');
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
    ? node.values.map(({ name }) => `| \`${name.value} `).join('')
    : [];
  return `
[@bs.deriving jsConverter]
type ${transforms.enum(node.name.value)} = [ ${values}];

${writeEnumMap(node)}
`;
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

  let methodName: string = '';

  if (isList) {
    methodName = isNullableList ? 'NullableArray' : 'Array';
  } else {
    if (isEnum) {
      methodName = 'Enum';
    } else if (scalar) {
      methodName = capitalize(scalar);
    } else {
      methodName = 'Field';
    }

    if (isNullable) {
      methodName = 'Nullable' + methodName;
    }
  }
  return `get${methodName}(${args.join(', ')})`;
};

const writeInputObjectFieldTypes = (fields: IField[]) =>
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

const writeObjectField = (node: IField) => {
  return `
  let ${sanitizeFieldName(node.name)}: field(t, ${getReasonFieldType(node, [
    [node => node.isEnum, transforms.enum],
    [node => !node.isEnum && !node.scalar, camelCase],
    [node => node.isNullable, transforms.option],
    [node => node.isList, transforms.array],
    [node => node.isNullableList, transforms.option],
  ])}) = ${fieldGetter(node)};`;
};

const writeObjectModule = (node: IObjectType) => {
  const fields = node.fieldDetails.map(writeObjectField).join('');
  return `module ${node.name.value} = {
    type t = ${camelCase(node.name.value)};
    let typename = "${node.name.value}";
    ${fields}
  };`;
};

const writeInputType = (node: IInputType) => {
  const fields = writeInputObjectFieldTypes(node.fieldDetails);

  return `${camelCase(node.name.value)} = {
    .
    ${fields}
  }`;
};

const writeObjectType = (node: IObjectType) => {
  const querydef =
    node.name.value === 'Query' || node.name.value === 'Mutation'
      ? ` = Js.Json.t`
      : '';
  return `type ${camelCase(node.name.value)}${querydef};`;
};

const writeInputTypeModule = (node: IInputType) =>
  writeInputModule(
    node.fieldDetails,
    node.name.value,
    camelCase(node.name.value),
    't',
    'make'
  );

export const plugin: PluginFunction<BaseReasonConfig> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  c: BaseReasonConfig
) => {
  const printedSchema = printSchema(schema);
  const astNode = parse(printedSchema);
  const config = { ...defaultBaseConfig, ...c };

  const visitor = makeVisitor(config, (data: ISchemaData) => {
    const { inputObjects, objects, enums } = data;
    const inputObjectTypeDefs =
      (inputObjects.length &&
        `type ${inputObjects.map(writeInputType).join(' and \n')};`) ||
      '';

    return `
    ${head}
    ${writeCustomScalars(config)}
    ${enums.map(writeEnumType).join('\n')}
    ${objects.map(writeObjectType).join('\n')}
    ${inputObjectTypeDefs}
    ${objects.map(writeObjectModule).join('\n')}
    ${inputObjects.map(writeInputTypeModule).join('\n')}
    `;
  });

  visit(astNode, {
    leave: visitor,
  });

  const result = visitor.write(documents);

  return config.refmt ? refmt(result) : result;
};
