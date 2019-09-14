---
id: configuring-codegen
title: Configuring Codegen
sidebar_label: Configuring Codeten
---

> The code generation portion of the project is a plugin for [GraphQL Code Generator](https://graphql-code-generator.com/). This page will walk you through the basics, but for more advanced options please see their documentation.

## Installing

You'll need to install the graphql-codegen CLI, the Reason plugins (included in this library) as well as graphql itself:

```bash
$ yarn add graphql @graphql-codegen/cli graphql-codegen-reason-client graphql-codegen-reason-react-apollo =D
```

## Configuration

Next, create a files named `codegen.yml` at the root of your project. It should look something like this:

```yml
schema: path/to/your/schema/or/endpoint.graphql
documents: path/to/your/graphql/documents/**/*.graphql
generates:
  path/to/typedefs/file/Graphql.re:
    config:
      filterInputTypes: true
      scalars:
        "DateTime": "string"
        "Json": "string"
    plugins:
      - reason-client
  path/to/operations/typedefs/Apollo.re:
    config:
      filterInputTypes: false
      graphqlTypesModuleName: Graphql
      graphQLErrorTypeName: GraphQLError.t
      scalars:
        "DateTime": "string"
        "Json": "string"
    plugins:
      - reason-react-apollo
```

Let's break this down a little bit...

**`schema` field**
The schema field points the the codegen tool at your GraphQL schema. This can be an SDL file, or an HTTP endpoint that will respond to an introspection query.

**`documents` field**
This indicates how the plugin should find the .graphql files in your project that contain operations (queries and mutations) so that it can generate the types for them.

## Schema Type Definitions

The first entry in the `generates` defines a file that will be generated to contain the type definitions for each type in our GraphQL schema. This file can be anywhere in your project and named anything you want, but it's reccomended you call it `Graphql.re`. This file should be generated using the `reason-client` plugin. It has the following options:

### `scalars`

This is a key/value pair of custom scalars in your GraphQL schema and what type you'd like to represent them in your Reason code. You can specify any built-in ReasonML type, or even a type you've defined in a module in your project, like `CustomTypes.dateTime`.

### `filterInputTypes`

Defaults to `false`. If set to `true`, the plugin will only generate types for Input types that are actually used somewhere else in the schema. This can be useful in cases where you may be including a lot of unused types in your schema (particularly when using Prisma.)

### `refmt`

Defaults to `true`. If false, the generator will not run `refmt` on the generated code. This can be helpful when debugging a problem with the code generator.

## Operation Type Definitions

Besides the types for your schema, you can also generate types for all of the operations (queries and mutations) in your project. The second entry in the `generates` section in the example configurations shows how this works. Again, the file path you specify can be anywhere in your project and named however you choose, but it's reccomended to call it `Apollo.re`. Besides the operation type definitions, this module will also include all of the bindings for reason-react-apollo. It has the following options:

### `scalars`

This is a key/value pair of custom scalars in your GraphQL schema and what type you'd like to represent them in your Reason code. You can specify any built-in ReasonML type, or even a type you've defined in a module in your project, like `CustomTypes.dateTime`.

### `refmt`

Defaults to `true`. If false, the generator will not run `refmt` on the generated code. This can be helpful when debugging a problem with the code generator.

## Generating the code

Once your project is configured, you can add a script to your package.json like so:

```json
"scripts": {
  "codegen": "graphql-codegen"
}
```

Now, when you run `yarn codegen`, you'll get a fresh version of your types.
