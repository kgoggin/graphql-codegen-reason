/* Apollo can return an empty object sometimes. We want to be able to treat
   this case as a None */
let mapEmptyObject = (data: Js.Json.t) => {
  data == Js.Json.object_(Js.Dict.empty()) ? None : Some(data);
};

module type ProjectConfig = {
  type query;
  let parse: Js.Json.t => query;
};

module type QueryConfig = {
  type variables;
  let parse: variables => Js.Json.t;
};

module MakeProject = (Config: ProjectConfig) => {
  [@bs.module "graphql-tag"]
  external gql: string => ApolloTypes.documentNode = "default";

  type apolloQueryResult('data) = {
    data: 'data,
    errors: option(array(ApolloTypes.graphqlError)),
    loading: bool,
    networkStatus: ApolloTypes.networkStatus,
    stale: bool,
  };

  type queryResult('data, 'variables) = {
    data: 'data,
    loading: bool,
    error: option(ApolloTypes.apolloError),
    variables: 'variables,
    networkStatus: ApolloTypes.networkStatus,
  };

  module MakeQuery = (QueryConfig: QueryConfig) => {
    let mapOnCompleted = (oc, jsData: Js.Json.t) => oc(jsData->Config.parse);

    let useQuery =
        (
          ~query: ApolloTypes.documentNode,
          ~displayName: option(string)=?,
          ~skip: option(bool)=?,
          ~variables: option(QueryConfig.variables)=?,
          ~fetchPolicy: option(ApolloTypes.watchQueryFetchPolicy)=?,
          ~errorPolicy: option(ApolloTypes.errorPolicy)=?,
          ~pollInterval: option(int)=?,
          ~client: option(ApolloTypes.apolloClient)=?,
          ~notifyOnNetworkStatusChange: option(bool)=?,
          ~context: option(ApolloTypes.context)=?,
          ~partialRefetch: option(bool)=?,
          ~returnPartialData: option(bool)=?,
          ~ssr: option(bool)=?,
          ~onCompleted: option(Config.query => unit)=?,
          ~onError: option(ApolloTypes.apolloError => unit)=?,
          (),
        ) => {
      let opt =
        ApolloTypes.queryHookOptions(
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
      let response = ApolloTypes.useQuery(query, opt);
      {
        data:
          response##data
          ->Js.Undefined.toOption
          ->Belt.Option.flatMap(mapEmptyObject)
          ->Belt.Option.map(Config.parse),
        loading: response##loading,
        error: Js.Undefined.toOption(response##error),
        variables: response##variables->QueryConfig.parse,
        networkStatus: response##networkStatus,
      };
    };
  };
};
