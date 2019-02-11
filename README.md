# GraphQL Codegen: Reason Client

A plugin for GraphQL Codegen to generate ReasonML types based on your GraphQL schema for use in a client application.

## Quick Start

Install using npm/yarn:

```bash
$ yarn add graphql-codegen-reason-client -D
```

Set up your project per the GraphQL Codegen Docs, and specify this plugin in your `codegen.yml`:

```yml
schema: http://path.to.your.app
generates:
  src/GraphQLTypes.re:
    - reason-client
```

### `__typename` is REQUIRED

In order to verify that the JSON object we're working with is of the expected GraphQL type, this lib requires that the `__typename` field be present for all GraphQL query respones. (If you're using apollo-client, [this is easily accomplished via a config setting that defaults to `true`](https://www.apollographql.com/docs/react/advanced/caching.html#configuration) - chances are you're already doing it!)

## Configuration

Currently the only supported configruation is specifying custom scalar values, like so:

```yml
schema: http://path.to.your.app
generates:
  src/GraphQLTypes.re:
    plugins:
      - reason-client
    config:
      scalars:
        "DateTime": "string"
```

Note that any custom scalars must be able to be decoded to a scalar Reason type (`string`, `bool`, `float`, etc.). Eventually it'd be great to support providing a reference to a custom decoder module...

## Working with the generated types

The API for the generated types was inspired by the [`[@bs.deriving abstract]` syntax recently released for bs-platform](https://bucklescript.github.io/docs/en/object.html#record-mode). This plugin will generate an abstract type that corresponds to each of your GraphQL `type` definitions, as well as a `module` for each that contains "getters" for the field. For example, a schema like this:

```
type Post {
  title: String!
  content: String
}

type Query {
  posts: [Post!]!
}
```

...generates some code that looks like this:

```re
type query = Js.Json.t;
type post;

module Query = {
  type t = query;
  let typeName = "Query";
  let posts: field(t, array(post)) = getArray(~fieldName="posts", ~typeName);
};

module Post = {
  type t = post;
  let typeName = "Post";
  let title: field(t, string) = getString(~fieldName="title", ~typeName);
  let content: field(t, option(string)) = getNullableString(~fieldName="title", ~typeName);
};
```

Then, you'd take the JSON returned from your GraphQL client and use it like so:

```re
let postTitle = response->Query.posts[0]->Post.title;
let postContent = response->Query.posts[1]->Post.content->Belt.Option.getExn;
```

Enums get typed using `[@bs.deriving jsConverter]`.

## Why not use graphql-ppx?

[graphql-ppx](https://github.com/mhallin/graphql_ppx) is a pretty awesome library that performs compule-time transforms of your actual GraphQL queries to generate a type that's specific _to that query_. It's great for what it does, but it doesn't allow for shared types that get defined in one place and are shared across your codebase, as each query generates its own type (even if you're fetching the same underlying GraphQL types).

This plugin provides a 1:1 relationship between your GraphQL types and your Reason types. In a large codebase, this can be a lot easier to reason (pardon the pun) about.

### Usage with reason-apollo

`// TODO: Add example of how to use with reason-apollo 😉`

## Conributing

Contributions are very welcome! At this point the library covers very basic GraphQL usage, but there are still some scenarios that aren't handled, including:

- Interfaces
- Unions
- Input types (and re-encoding as JSON for variables, etc.)
- Probably some other things I'm not even thinking of right now

### Development workflow

I've set the repo up such that the tests are written in ReasonML against the generated types. The idea is that the test suite is testing not just the generated code but the ability of the code to actually parse some JSON and use it like you'd expect.

In the `tester` directory, you'll find a `schema.graphql` that's the basis for our tests. To add a new feature, amend the schema to include a new scenario. Then run `tsc` in watch mode:

```bash
$ yarn build:ts -watch
```

As you make changes to the schema and/or the `.ts` files, re-generate the Reason types by running:

```bash
$ yarn generate
```

Then you'll also want to have `bsb` running to tip you off to any issues with the generated output:

```bash
$ yarn build:re -w
```

Finally, you can add a test to `CodegenTest.re` for the scenario you're trying to cover. The tests follow a basic pattern of defining a fixture that represents the JSON returned from a GraphQL query, then parsing the JSON into Reason, accessing some data, and asserting that it's what we expect it to be.
