type documentNode;
type watchQueryFetchPolicy;
type errorPolicy;
type apolloClient;
type apolloLink;
type apolloCache;
type context;
type data = Js.Json.t;
type networkStatus;

type graphqlError;

type apolloErrorJs = {
  .
  "message": string,
  "graphQLErrors": Js.Undefined.t(array(graphqlError)),
  "networkError": Js.Undefined.t(Js.Exn.t),
};

[@bs.deriving abstract]
type queryHookOptions = {
  [@bs.optional]
  query: documentNode,
  [@bs.optional]
  displayName: string,
  [@bs.optional]
  skip: bool,
  [@bs.optional]
  variables: Js.Json.t,
  [@bs.optional]
  fetchPolicy: watchQueryFetchPolicy,
  [@bs.optional]
  errorPolicy,
  [@bs.optional]
  pollInterval: int,
  [@bs.optional]
  client: apolloClient,
  [@bs.optional]
  notifyOnNetworkStatusChange: bool,
  [@bs.optional]
  context,
  [@bs.optional]
  partialRefetch: bool,
  [@bs.optional]
  returnPartialData: bool,
  [@bs.optional]
  ssr: bool,
  [@bs.optional]
  onCompleted: data => unit,
  [@bs.optional]
  onError: apolloErrorJs => unit,
};

[@bs.deriving abstract]
type lazyQueryHookOptions = {
  [@bs.optional]
  query: documentNode,
  [@bs.optional]
  displayName: string,
  [@bs.optional]
  variables: Js.Json.t,
  [@bs.optional]
  fetchPolicy: watchQueryFetchPolicy,
  [@bs.optional]
  errorPolicy,
  [@bs.optional]
  pollInterval: int,
  [@bs.optional]
  client: apolloClient,
  [@bs.optional]
  notifyOnNetworkStatusChange: bool,
  [@bs.optional]
  context,
  [@bs.optional]
  partialRefetch: bool,
  [@bs.optional]
  returnPartialData: bool,
  [@bs.optional]
  ssr: bool,
  [@bs.optional]
  onCompleted: data => unit,
  [@bs.optional]
  onError: apolloErrorJs => unit,
};

type queryLazyOptions('variables) = {
  .
  "variables": Js.Undefined.t('variables),
};

type apolloQueryResultJs('data) = {
  .
  "data": 'data,
  "errors": Js.Undefined.t(array(graphqlError)),
  "loading": bool,
  "networkStatus": networkStatus,
  "stale": bool,
};

type queryResultJs('data, 'variables) = {
  .
  "data": Js.Undefined.t('data),
  "loading": bool,
  "error": Js.Undefined.t(apolloErrorJs),
  "variables": 'variables,
  "networkStatus": networkStatus,
  "refetch": 'variables => Js.Promise.t(apolloQueryResultJs('data)),
};

type mutationFunctionOptions('data, 'variables) = {
  .
  "variables": Js.Undefined.t('variables),
  "optimisticResponse": Js.Undefined.t('variables => 'data),
};

type mutationHookOptions;
[@bs.obj]
external mutationHookOptions:
  (
    ~mutation: documentNode=?,
    ~variables: Js.Json.t=?,
    ~errorPolicy: errorPolicy=?,
    unit
  ) =>
  mutationHookOptions =
  "";

type executionResultJs = {
  .
  "data": Js.Undefined.t(Js.Json.t),
  "errors": Js.Undefined.t(array(graphqlError)),
};

type mutationResultJs('data) = {
  .
  "data": Js.Undefined.t('data),
  "error": Js.Undefined.t(apolloErrorJs),
  "loading": bool,
  "called": bool,
  "client": Js.Undefined.t(apolloClient),
};

[@bs.module "@apollo/react-hooks"]
external useQuery:
  (documentNode, queryHookOptions) => queryResultJs('data, 'variables) =
  "useQuery";

[@bs.module "@apollo/react-hooks"]
external useLazyQuery:
  (documentNode, lazyQueryHookOptions) =>
  (queryLazyOptions('variables) => unit, queryResultJs('data, 'variables)) =
  "useLazyQuery";

[@bs.module "@apollo/react-hooks"]
external useMutation:
  (documentNode, mutationHookOptions) =>
  (
    mutationFunctionOptions('data, 'variables) =>
    Js.Promise.t(executionResultJs),
    mutationResultJs('data),
  ) =
  "useMutation";

type linkOptions;
[@bs.obj] external linkOptions: (~uri: string) => linkOptions = "";

type clientOptions;
[@bs.obj]
external clientOptions:
  (
    ~link: apolloLink,
    ~cache: apolloCache,
    ~ssrMode: bool=?,
    ~ssrForceFetchDelay: int=?,
    ~connectToDevTools: bool=?,
    ~queryDeduplication: bool=?,
    unit
  ) =>
  clientOptions =
  "";

[@bs.module "apollo-link-http"] [@bs.new]
external createHttpLink: linkOptions => apolloLink = "HttpLink";

[@bs.module "apollo-client"] [@bs.new]
external createApolloClient: clientOptions => apolloClient = "ApolloClient";

module ApolloProvider = {
  [@bs.module "@apollo/react-hooks"] [@react.component]
  external make:
    (~client: apolloClient, ~children: React.element) => React.element =
    "ApolloProvider";
};
