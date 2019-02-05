export const head = `
type field('root, 'base) = 'root => 'base;

let verifyGraphQLType = (~typeName, json) =>
  switch (json->Js.Json.decodeObject) {
  | None =>
    Js.log({j|Unable to decode $typeName object|j});
    raise(Not_found);
  | Some(root) =>
    switch (root->Js.Dict.get("__typeName")) {
    | None =>
      Js.log("Provided object is not a GraphQL object");
      raise(Not_found);
    | Some(name) =>
      switch (name->Js.Json.decodeString) {
      | Some(name) when name == typeName => root
      | _ =>
        Js.log({j|Provided object is not $typeName type|j});
        raise(Not_found);
      }
    }
  };

external toJSON: 'base => Js.Json.t = "%identity";
external fromJSON: Js.Json.t => 'base = "%identity";

type graphQLDecoder('root, 'scalar) =
  (~typeName: string, ~fieldName: string, 'root) => 'scalar;

type graphQLArrayDecoder('root, 'scalar) =
  (
    ~typeName: string,
    ~fieldName: string,
    ~decoder: Js.Json.t => 'scalar=?,
    'root
  ) =>
  array('scalar);

let getField = (~fieldName, ~typeName, data) =>
  switch (data->toJSON->verifyGraphQLType(~typeName)->Js.Dict.get(fieldName)) {
  | None =>
    Js.log(
      {j|Field $fieldName was not present on provided $typeName object. Did you forget to fetch it?|j},
    );
    raise(Not_found);
  | Some(result) => result->fromJSON
  };

let getNullableField = (~fieldName, ~typeName, data) =>
  switch (data->toJSON->verifyGraphQLType(~typeName)->Js.Dict.get(fieldName)) {
  | None =>
    Js.log(
      {j|Field $fieldName was not present on provided $typeName object. Did you forget to fetch it?|j},
    );
    raise(Not_found);
  | Some(result) =>
    if ((Obj.magic(result): Js.null('a)) === Js.null) {
      None;
    } else {
      Some(result->fromJSON);
    }
  };

let getArray:
  (
    ~typeName: string,
    ~fieldName: string,
    ~decoder: Js.Json.t => 'scalar=?,
    'root
  ) =>
  array('scalar) =
  (~typeName, ~fieldName, ~decoder=fromJSON, data) => {
    let arr = getField(~fieldName, ~typeName, data);
    arr->Belt.Array.map(data => decoder(data));
  };

let getNullableArray:
  (
    ~typeName: string,
    ~fieldName: string,
    ~decoder: Js.Json.t => 'scalar=?,
    'root
  ) =>
  option(array('scalar)) =
  (~typeName, ~fieldName, ~decoder=fromJSON, data) => {
    let arr = getField(~fieldName, ~typeName, data);
    if ((Obj.magic(arr): Js.null('a)) === Js.null) {
      None;
    } else {
      Some(arr->Belt.Array.map(decoder));
    };
  };

let makeDecoder =
    (~typeName, ~fieldName, ~decoder: Js.Json.t => 'scalar, json) =>
  switch (getField(~fieldName, ~typeName, json)->decoder) {
  | None => raise(Not_found)
  | Some(value) => value
  };

let makeNullableDecoder =
    (~typeName, ~fieldName, ~decoder: Js.Json.t => 'scalar, json) => {
  let value = getField(~fieldName, ~typeName, json);
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

let getString: graphQLDecoder('root, string) =
  makeDecoder(~decoder=Js.Json.decodeString);

let getNullableString: graphQLDecoder('root, option(string)) =
  makeNullableDecoder(~decoder=Js.Json.decodeString);

let getFloat: graphQLDecoder('root, float) =
  makeDecoder(~decoder=Js.Json.decodeNumber);

let getNullableFloat: graphQLDecoder('root, option(float)) =
  makeNullableDecoder(~decoder=Js.Json.decodeNumber);

let getBool: graphQLDecoder('root, bool) =
  makeDecoder(~decoder=Js.Json.decodeBoolean);

let getNullableBool: graphQLDecoder('root, option(bool)) =
  makeNullableDecoder(~decoder=Js.Json.decodeBoolean);

let decodeEnum =
    (~typeName, ~fieldName, ~decoder: string => 'enum, data: Js.Json.t) => {
  switch (data->Js.Json.decodeString) {
  | None => raise(Not_found)
  | Some(str) =>
    switch (str->decoder) {
    | None =>
      Js.log(
        {j|Unknown enum value $str was provided for field $fieldName on $typeName|j},
      );
      raise(Not_found);
    | Some(value) => value
    }
  };
};

let getEnum = (~typeName, ~fieldName, ~decoder, json) => {
  let str = getString(~typeName, ~fieldName, json);
  switch (str->decoder) {
  | None =>
    Js.log(
      {j|Unknown enum value $str was provided for field $fieldName on $typeName|j},
    );
    raise(Not_found);
  | Some(value) => value
  };
};

let getNullableEnum = (~typeName, ~fieldName, ~decoder, json) => {
  let str = getNullableString(~typeName, ~fieldName, json);
  str->Belt.Option.map(value =>
    switch (value->decoder) {
    | None =>
      Js.log(
        {j|Unknown enum value $str was provided for field $fieldName on $typeName|j},
      );
      raise(Not_found);
    | Some(value) => value
    }
  );
};
`;
