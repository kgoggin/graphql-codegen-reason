/* Apollo can return an empty object sometimes. We want to be able to treat
   this case as a None */
let mapEmptyObject = (data: Js.Json.t) => {
  data == Js.Json.object_(Js.Dict.empty()) ? None : Some(data);
};

module type ProjectConfig = {
  type query;
  type mutation;
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

  type apolloQueryResult = {
    data: option(Config.query),
    errors: option(array(graphqlError)),
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
    errors: option(array(graphqlError)),
  };

  type mutationResult = {
    data: option(Config.mutation),
    error: option(apolloError),
    loading: bool,
    called: bool,
  };

  module MakeQuery = (QueryConfig: QueryConfig) => {
    include QueryConfig;
    let mapOnCompleted = (oc, jsData: Js.Json.t) =>
      oc(jsData->Config.parseQuery);

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
          ~onError?,
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
        error: Js.Undefined.toOption(response##error),
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
        |> Js.Promise.then_(jsResponse =>
             Js.Promise.resolve({
               data:
                 jsResponse##data
                 ->Js.Undefined.toOption
                 ->Belt.Option.flatMap(mapEmptyObject)
                 ->Belt.Option.map(Config.parseMutation),
               errors: jsResponse##errors->Js.Undefined.toOption,
             })
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
          error: responseJs##error->Js.Undefined.toOption,
          loading: responseJs##loading,
          called: responseJs##called,
        }: mutationResult,
      );
    };
  };
};
