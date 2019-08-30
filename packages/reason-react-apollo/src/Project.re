/* Apollo can return an empty object sometimes. We want to be able to treat
   this case as a None */
let mapEmptyObject = (data: Js.Json.t) => {
  data == Js.Json.object_(Js.Dict.empty()) ? None : Some(data);
};

module type ProjectConfig = {
  type query;
  type mutation;
  type graphQLError;
  let parseQuery: Js.Json.t => query;
  let parseMutation: Js.Json.t => mutation;
};

module type QueryConfig = {
  type variables;
  let parse: variables => Js.Json.t;
  let query: ApolloTypes.documentNode;
};

module type MutationConfig = {
  type variables;
  let parse: variables => Js.Json.t;
  let mutation: ApolloTypes.documentNode;
};

module Make = (Config: ProjectConfig) => {
  include ApolloTypes;

  /* Apollo Promises reject with an ApolloError. This let's us map them
     to the correct type. */
  external mapPromiseErrorToApolloError: Js.Promise.error => apolloErrorJs =
    "%identity";

  /* Allows for typing the project's GraphQL errors in whatever way works best
     for that project */
  external mapGraphQLError: graphqlError => Config.graphQLError = "%identity";

  type apolloError = {
    message: string,
    graphQLErrors: option(array(Config.graphQLError)),
    networkError: option(Js.Exn.t),
  };

  type apolloQueryResult = {
    data: option(Config.query),
    errors: option(array(Config.graphQLError)),
    loading: bool,
    networkStatus,
    stale: bool,
  };

  type queryResult('variables) = {
    data: option(Config.query),
    loading: bool,
    error: option(apolloError),
    variables: 'variables,
    networkStatus,
  };

  type executionResult = {
    data: option(Config.mutation),
    errors: option(array(Config.graphQLError)),
  };

  type mutationResult = {
    data: option(Config.mutation),
    error: option(apolloError),
    loading: bool,
    called: bool,
  };

  let mapApolloError: apolloErrorJs => apolloError =
    jsErr => {
      message: jsErr##message,
      graphQLErrors:
        jsErr##graphQLErrors
        ->Js.Undefined.toOption
        ->Belt.Option.map(arr => arr->Belt.Array.map(mapGraphQLError)),
      networkError: jsErr##networkError->Js.Undefined.toOption,
    };

  let mapOnCompleted = (oc, jsData: Js.Json.t) =>
    oc(jsData->Config.parseQuery);

  let mapOnError = (oe, jsError: apolloErrorJs) =>
    oe(jsError->mapApolloError);

  module MakeQuery = (QueryConfig: QueryConfig) => {
    include QueryConfig;

    let useQuery =
        (
          ~query as overrideQuery: option(documentNode)=?,
          ~displayName: option(string)=?,
          ~skip: option(bool)=?,
          ~variables: option(QueryConfig.variables)=?,
          ~fetchPolicy: option(watchQueryFetchPolicy)=?,
          ~errorPolicy: option(errorPolicy)=?,
          ~pollInterval: option(int)=?,
          ~client: option(apolloClient)=?,
          ~notifyOnNetworkStatusChange: option(bool)=?,
          ~context: option(context)=?,
          ~partialRefetch: option(bool)=?,
          ~returnPartialData: option(bool)=?,
          ~ssr: option(bool)=?,
          ~onCompleted: option(Config.query => unit)=?,
          ~onError: option(apolloError => unit)=?,
          (),
        ) => {
      let opt =
        queryHookOptions(
          ~displayName?,
          ~skip?,
          ~variables=?{
            variables->Belt.Option.map(QueryConfig.parse);
          },
          ~fetchPolicy?,
          ~errorPolicy?,
          ~pollInterval?,
          ~client?,
          ~notifyOnNetworkStatusChange?,
          ~context?,
          ~partialRefetch?,
          ~returnPartialData?,
          ~ssr?,
          ~onCompleted=?{
            onCompleted->Belt.Option.map(mapOnCompleted);
          },
          ~onError=?{
            onError->Belt.Option.map(mapOnError);
          },
          (),
        );
      let response =
        useQuery(overrideQuery->Belt.Option.getWithDefault(query), opt);
      {
        data:
          response##data
          ->Js.Undefined.toOption
          ->Belt.Option.flatMap(mapEmptyObject)
          ->Belt.Option.map(Config.parseQuery),
        loading: response##loading,
        error:
          response##error
          ->Js.Undefined.toOption
          ->Belt.Option.map(mapApolloError),
        variables: response##variables->QueryConfig.parse,
        networkStatus: response##networkStatus,
      };
    };
  };

  module MakeMutation = (MutationConfig: MutationConfig) => {
    include MutationConfig;

    let useMutation =
        (
          ~mutation as overrideMutation: option(documentNode)=?,
          ~variables: option(MutationConfig.variables)=?,
          (),
        ) => {
      let opt =
        ApolloTypes.mutationHookOptions(
          ~variables=?{
            variables->Belt.Option.map(MutationConfig.parse);
          },
          (),
        );
      let (mutateJs, responseJs) =
        useMutation(
          overrideMutation->Belt.Option.getWithDefault(
            MutationConfig.mutation,
          ),
          opt,
        );
      let mutate = (~variables: option(MutationConfig.variables)=?, ()) => {
        mutateJs({
          "variables":
            variables
            ->Belt.Option.map(MutationConfig.parse)
            ->Js.Undefined.fromOption,
          "optimisticResponse": Js.Undefined.empty,
        })
        ->FutureJs.fromPromise(err =>
            err->mapPromiseErrorToApolloError->mapApolloError
          )
        ->Future.mapOk(jsResponse =>
            {
              data:
                jsResponse##data
                ->Js.Undefined.toOption
                ->Belt.Option.flatMap(mapEmptyObject)
                ->Belt.Option.map(Config.parseMutation),
              errors:
                jsResponse##errors
                ->Js.Undefined.toOption
                ->Belt.Option.map(arr =>
                    arr->Belt.Array.map(mapGraphQLError)
                  ),
            }
          );
      };
      (
        mutate,
        {
          data:
            responseJs##data
            ->Js.Undefined.toOption
            ->Belt.Option.flatMap(mapEmptyObject)
            ->Belt.Option.map(Config.parseMutation),
          error:
            responseJs##error
            ->Js.Undefined.toOption
            ->Belt.Option.map(mapApolloError),
          loading: responseJs##loading,
          called: responseJs##called,
        }: mutationResult,
      );
    };
  };
};
