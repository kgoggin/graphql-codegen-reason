---
id: using-queries
title: Working With Queries
---

> The following assumes you have configured your project to use codegen as descrived in [Configuring Codegen](setting-up.md);

## Generated Query Modules

Let's assume you've defined a query that looks like this:

```graphql
query MyCoolQuery($filter: String!) {
  todos(filter: $filter) {
    id
    title
    isComplete
  }
}
```

Once you've run the codegen, you'll now be able to access this query at `Apollo.Queries.MyCoolQuery`. This generated module will have a definition that looks like this:

```reason
module MyCoolQuery = {
  type variables = {. "filter": string};
  let parse = variables => Js.Json.t;
  let query = ReasonReactApollo.ApolloTypes.documentNode;
  let useQuery:
    (~query: documentNode=?, ~displayName: string=?, ~skip: bool=?,
    ~variables: {. "filter": string}=?,
    ~fetchPolicy: watchQueryFetchPolicy=?, ~errorPolicy: errorPolicy=?,
    ~pollInterval: int=?, ~client: apolloClient=?,
    ~notifyOnNetworkStatusChange: bool=?, ~context: context=?,
    ~partialRefetch: bool=?, ~returnPartialData: bool=?, ~ssr:
    bool=?, ~onCompleted: Query.t => unit=?,
    ~onError: apolloError => unit=?, unit) => queryResult('a);
  let useLazyQuery:
    (~query: documentNode=?, ~displayName: string=?,
    ~variables: {. "filter": string}=?,
    ~fetchPolicy: watchQueryFetchPolicy=?, ~errorPolicy: errorPolicy=?,
    ~pollInterval: int=?, ~client: apolloClient=?,
    ~notifyOnNetworkStatusChange: bool=?, ~context: context=?,
    ~partialRefetch: bool=?, ~returnPartialData: bool=?, ~ssr:
    bool=?, ~onCompleted: Query.t => unit=?,
    ~onError: apolloError => unit=?, unit) =>
    ((~variables: {. "filter": string}=?, unit) => unit,
    queryResult(Js.Json.t));
  let makeVariables:
    (~filter: string, unit) => {. "filter": string};
};
```

**`type variables`**
This is the type for the variables defined in the operation, expressed as a `Js.t`

**`parse`**
This is a function that takes `variables` and transforms it into JSON (which, behind the scenes, is an identity function).

**`query`**
The query variable is the result of running the operation definition through the `gql` tag. It's compiled down to a plain JS object that's ready to be passed directly to Apollo with no further runtime work! In most cases you won't need to access this, but it can be handy if you want to work directly with the query.

**`useQuery`**
This function is a ReasonML binding for Apollo's useQuery hook, and accepts all of the same configuration options (though some have been tweaked to make them more Reason-friendly). Note that since we've already pre-processed the query doecument, you don't need to directly pass it as an argument as you would in the JS version.

**`useLazyQuery`**
This function is a ReasonML binding for Apollo's useLazyQuery hook, and accepts all of the same configuration options (though some have been tweaked to make them more Reason-friendly.) Note that since we've already pre-processed the query doecument, you don't need to directly pass it as an argument as you would in the JS version.

**`makeVariables**
This is a helper function for generating the variables required for the query. By using this you're able to tap into Reason's functional programming advantages like partial application.
