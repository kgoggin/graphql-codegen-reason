export const head = `
type field('root, 'base) = 'root => 'base;

type enumMap('enum) = {
  toString: 'enum => string,
  fromString: string => option('enum),
};

exception Graphql_Verify(string);
exception Graphql_Missing_Field(string);
exception Graphql_Bad_Enum_Value(string);

let verifyGraphQLType = (~typename, json) =>
  switch (json->Js.Json.decodeObject) {
  | None => raise(Graphql_Verify({j|Unable to decode $typename object|j}))
  | Some(root) =>
    typename == "Query" || typename == "Mutation"
      ? root
      : (
        switch (root->Js.Dict.get("__typename")) {
        | None =>
          raise(Graphql_Verify("Provided object is not a GraphQL object"))
        | Some(name) =>
          switch (name->Js.Json.decodeString) {
          | Some(name) when name == typename => root
          | _ =>
            raise(
              Graphql_Verify({j|Provided object is not $typename type|j}),
            )
          }
        }
      )
  };

external toJSON: 'base => Js.Json.t = "%identity";
external fromJSON: Js.Json.t => 'base = "%identity";

type graphQLDecoder('root, 'scalar) =
  (~typename: string, ~fieldName: string, 'root) => 'scalar;

type graphQLArrayDecoder('root, 'scalar) =
  (
    ~typename: string,
    ~fieldName: string,
    ~decoder: Js.Json.t => 'scalar=?,
    'root
  ) =>
  array('scalar);

let getField = (~fieldName, ~typename, data) =>
  switch (data->toJSON->verifyGraphQLType(~typename)->Js.Dict.get(fieldName)) {
  | None =>
    raise(
      Graphql_Missing_Field(
        {j|Field $fieldName was not present on provided $typename object. Did you forget to fetch it?|j},
      ),
    )
  | Some(result) => result->fromJSON
  };

let getNullableField = (~fieldName, ~typename, data) =>
  switch (data->toJSON->verifyGraphQLType(~typename)->Js.Dict.get(fieldName)) {
  | None =>
    raise(
      Graphql_Missing_Field(
        {j|Field $fieldName was not present on provided $typename object. Did you forget to fetch it?|j},
      ),
    )
  | Some(result) =>
    if ((Obj.magic(result): Js.null('a)) === Js.null) {
      None;
    } else {
      Some(result->fromJSON);
    }
  };

let getArray:
  (
    ~typename: string,
    ~fieldName: string,
    ~decoder: Js.Json.t => 'scalar=?,
    'root
  ) =>
  array('scalar) =
  (~typename, ~fieldName, ~decoder=fromJSON, data) => {
    let arr = getField(~fieldName, ~typename, data);
    arr->Belt.Array.map(data => decoder(data));
  };

let getNullableArray:
  (
    ~typename: string,
    ~fieldName: string,
    ~decoder: Js.Json.t => 'scalar=?,
    'root
  ) =>
  option(array('scalar)) =
  (~typename, ~fieldName, ~decoder=fromJSON, data) => {
    let arr = getField(~fieldName, ~typename, data);
    if ((Obj.magic(arr): Js.null('a)) === Js.null) {
      None;
    } else {
      Some(arr->Belt.Array.map(decoder));
    };
  };

let makeDecoder =
    (~typename, ~fieldName, ~decoder: Js.Json.t => 'scalar, json) =>
  getField(~fieldName, ~typename, json)->decoder->Belt.Option.getExn;

let makeNullableDecoder =
    (~typename, ~fieldName, ~decoder: Js.Json.t => 'scalar, json) => {
  let value = getField(~fieldName, ~typename, json);
  switch (value->decoder) {
  | None =>
    if ((Obj.magic(value): Js.null('a)) === Js.null) {
      None;
    } else {
      raise(Not_found);
    }
  | Some(value) => Some(value)
  };
};

let decodeInt = json =>
  json->Js.Json.decodeNumber->Belt.Option.map(int_of_float);

let getString: graphQLDecoder('root, string) =
  makeDecoder(~decoder=Js.Json.decodeString);

let getNullableString: graphQLDecoder('root, option(string)) =
  makeNullableDecoder(~decoder=Js.Json.decodeString);

let getFloat: graphQLDecoder('root, float) =
  makeDecoder(~decoder=Js.Json.decodeNumber);

let getNullableFloat: graphQLDecoder('root, option(float)) =
  makeNullableDecoder(~decoder=Js.Json.decodeNumber);

let getInt: graphQLDecoder('root, int) = makeDecoder(~decoder=decodeInt);

let getNullableInt: graphQLDecoder('root, option(int)) =
  makeNullableDecoder(~decoder=decodeInt);

let getBool: graphQLDecoder('root, bool) =
  makeDecoder(~decoder=Js.Json.decodeBoolean);

let getNullableBool: graphQLDecoder('root, option(bool)) =
  makeNullableDecoder(~decoder=Js.Json.decodeBoolean);

let decodeEnum =
    (~typename, ~fieldName, ~decoder: string => 'enum, data: Js.Json.t) =>
  switch (data->Js.Json.decodeString) {
  | None => raise(Not_found)
  | Some(str) =>
    switch (str->decoder) {
    | None =>
      raise(
        Graphql_Bad_Enum_Value(
          {j|Unknown enum value $str was provided for field $fieldName on $typename|j},
        ),
      )
    | Some(value) => value
    }
  };

let getEnum = (~typename, ~fieldName, ~decoder, json) => {
  let str = getString(~typename, ~fieldName, json);
  switch (str->decoder) {
  | None =>
    raise(
      Graphql_Bad_Enum_Value(
        {j|Unknown enum value $str was provided for field $fieldName on $typename|j},
      ),
    )
  | Some(value) => value
  };
};

let getNullableEnum = (~typename, ~fieldName, ~decoder, json) => {
  let str = getNullableString(~typename, ~fieldName, json);
  str->Belt.Option.map(value =>
    switch (value->decoder) {
    | None =>
      raise(
        Graphql_Bad_Enum_Value(
          {j|Unknown enum value $str was provided for field $fieldName on $typename|j},
        ),
      )
    | Some(value) => value
    }
  );
};
`;
