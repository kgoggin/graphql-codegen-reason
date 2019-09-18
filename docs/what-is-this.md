---
id: overview
title: Overview
---

## What Even Is This?

This project aims to provide a hassle-free way of using Apollo's React library in your ReasonML project. To that end, it includes:

1.  A codegen plugin for generating ReasonML types that correspond 1:1 with your GraphQL schema's types.
2.  A codegen plugin for generating ReasonML types for your project's GraphQL operations' variables.
3.  ReasonML bindings for Apollo's react-hooks library that work hand-in-hand with the generated types, allowing you to write type-safe queries and mutations that use Apollo's fantastic tooling under the covers.

## How is this different from other Reason + Apollo bindings?

The main difference between this project and most (all?) other approaches to ReasonML bindings for Apollo is that it does _not_ utilize graphql-ppx to generate type code for your operations, opting instead to generate types for your entire schema in one go. You can read more about the difference (and the pros and cons of both approaches) here.

## How does it work?

After setting your project up for using the codegen plugins and running it against your schema, you'll wind up with two generated Reason files:

1.  Abstract types that correspond 1:1 with all of the types defined in your GraphQL schema.
2.  Modules corresponding to each query + mutation in your app that tie in with the Apollo bindings to type the operation variables and pull in the operation's ast document for you.

So, if you've got an operation defined like so:

```graphql
query MyCoolQuery($filter: String!) {
  todos(filter: $filter) {
    id
    title
    isComplete
  }
}
```

You can use it in a reason-react component like this:

```reason
[@react.component]
let make = () => {
  open Apollo.Queries.MyCoolQuery;
  let variables = makeVariables(~filter: "all", ());
  let response = useQuery(~variables, ());
  switch (response) {
    | {loading: true} => <LoadingIndicator />
    | {error: Some(err)} => <ErrorDisplay err />
    | {data: Some(queryRoot)} =>
      let todos = queryRoot->Graphql.Query.todos;
      <TodosList todos />
  };
}
```

Notice how the Apollo hooks code looks almost exactly like its JS counterpart, but we've got typed variables + the ability to pattern match on the response 😍!

The first thing to notice is that we're opening the `Apollo.Queries.MyCoolQuery` module. That's code that was all generated for you automatically, just based on your GraphQL operation. It contains the `makeVariables` creation function, as well as the `useQuery` hook which is specifically typed for this operations' variables.

Next, take a look at how we're working with the response from `useQuery`. Just like in the JS counterpart, we can access `loading`, `error`, and `data` fields, only they're typed as a Reason record, and with `option` where appropriate instead of `undefined`.

Finally, look at how we're using the query's returned data. `queryRoot` is an abstract type representing the root `Query` type in your schema. All GraphQL queries _always_ return this type. We can pass this type to a getter function named for the field we want: `todos`. The result is a an array of the `Todo` type. The TodosList component's type signature can specify it wants `array(Graphql.Todo.t)`. Maybe there's another part of your app where you show a list of todos, but fetched with a slightly different query - no worries, you can still reuse the same component there as well!

### Handling Unfetched Fields

Using abstract types in this way, rather than generating a type that corresponds directly to the fields we queried for does have a drawback: there's no way to ensure we're not trying to use a field we didn't actually fetch at _compile time_. For example, if my `<TodosList>` compomnent depdnds on a `createdAt` field (which wasn't fetched in the example query), there's no way for the compiler to catch my error and tell me.

However, we _can_ still check for this error at _run time_, and that's exactly what the abstract type getter functions do. If your code tries to get a field that isn't present in the underlying JSON object, you'll see a rumtime error thrown that helpfully tells you which field is missing on which type, allowinng you to catch your error while still in the development cycle well before shipping the bad code to users!
