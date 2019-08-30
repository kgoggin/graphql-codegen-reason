# Reason React Apollo

reason-react-apollo is a set of ReasonML bindings for Apollo's React-specific libraries that relies on generated GraphQL types that align with your schema, instead of query-specific types.

## GraphQL Typing Philosophy

Unlike most (all?) other GraphQL client bindings, this package makes some different assumptions about how you're typing your GraphQL. Rather than _query-specific_ types, using something like graphql-ppx, it assumes you've instead got types defined that correspond 1:1 with your underlying GraphQL schema, as well as a way to parse a JSON query/mutation response into these types.

With those types in place, the aim of these bindings is to provide a _very_ light wrapper around the actual Apollo API so that the runtime cost of the bindings themselves is negligible.

### Using Codegen

Let's face it, writing out your types by hand is a major drag. So, let's get a computer to do it for us! If you're using these bindings, you'll almost certainly want to also use its sister project, `graphql-codegen-reason`, which can generate all of the type code you need to use these bindings, automatically. **So, before you set up this library, you'll probably want to head over there and get that set up first.** It's cool, we'll wait.

## Getting Started

Install this lib, plus `reason-future`:

```bash
yarn add reason-react-hooks reason-future
```

and then, in your bsconfig.json file:

```json
  "bs-dependencies": [
    "reason-react-apollo",
    "reason-future"
  ]
```

The rest of this documentation assumes you've got all of your code generated via the codegen tools, in which case you're ready to start!

## `useQuery` Hook

Assuming you've got a query operation called `AllTodos`, you can use the query hook like so:

```reason
open Apollo.Queries.AllTodos;
let result = useQuery();
```

`useQuery` takes labeled arguments that correspond to all of the configuration options for the JS version of the hook. So, if you've got some variables, for example:

```reason
open Apollo.Queries.FilteredTodos;
let result = useQuery(~variables=makeVariables(~isComplete=true, ()), ());
```

(`makeVariables` is automatically generated for you via the codegen tool - it's a function you can call to create the query's variables object!)

### Result Type

To make it a little easier to work with, the result of the query is transformed from a JS object into a Reason record, and potentially undefined values are transformed into `option`s. It looks like this:

```reason
type queryResult('variables) = {
 data: option(Project.query),
 loading: bool,
 error: option(apolloError),
 variables: 'variables,
};
```

## `useMutation` Hook

Apollo's `useMutation` hook works similarly:

```reason
open Apollo.Mutations.CompleteTodo;
let (completeTodo, result) = useMutation(~variables=makeVariables(~id="123", ()), ());
```

Here, we've got a tuple that includes the function you'll call to perform the mutation, as well as the mutation's result.

## Result Type

Just as with the query, the result type of the mutation is transformed into a Reason record:

```reason
type mutationResult = {
  data: option(Config.mutation),
  error: option(apolloError),
  loading: bool,
  called: bool,
};
```

The mutation function returns an execution result, which is also mapped to a record. It's returned as a promise which is typed using reason-future, an alternative to `Js.Promise.t` which is more typesafe and much easier to work with:

```reason
type executionResult = {
  data: option(Config.mutation),
  errors: option(array(Config.graphQLError)),
};

type muatateFunctionResult = Future.t(
  Belt.Result.t(
    executionResult,
    apolloError
  )
)
```

## Apollo Error Type

Apollo Errors are also transformed from their native JS type into a more Reason-friendly record:

```reason
type apolloError = {
  message: string,
  graphQLErrors: option(array(Project.graphQLError)),
  networkError: option(Js.Exn.t),
};
```

`Project.graphQLError` is the type you specified when you configured the project. Since GraphQL errors can be extended to meed the needs of a specific project, it's up to you to type it the way that makes the most sense. The bindings will automatically map the JS type to your specified type using the `"%identity"` transform BuckleScript provides.

## What about the rest of the react-apollo API?

Higher-order components aren't very practical in Reason so I doubt they'll ever be supported here. Query and Mutation components have been effectively replaced by the hooks API (Apollo suggests using them going forward) but they could be added here, if there was enough interest.

**The most notable omission for now is types pertaining to the initialization of the apollo client itself**. These are definitely coming - for now you can create the client in JS :).
