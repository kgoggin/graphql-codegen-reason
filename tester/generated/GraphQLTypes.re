
    
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

    type dateTime = string;
    
[@bs.deriving jsConverter]
type postStatus_enum = [ | `DRAFT | `PENDING_REVIEW | `PUBLISHED ];

    type query = Js.Json.t;
  type post;
  type author;
  type postMeta;
    type createAuthorInput = {
    .
    "firstName": string,
    "lastName": Js.Nullable.t(string)
  } and authorWhereUniqueInput = {
    .
    "firstName": string
  } and createConnectAuthor = {
    .
    "connect": Js.Nullable.t(authorWhereUniqueInput),
    "create": Js.Nullable.t(createAuthorInput)
  } and createPostInput = {
    .
    "title": Js.Nullable.t(string),
    "content": string,
    "status": string,
    "maybeStatus": Js.Nullable.t(string),
    "statuses": Js.Nullable.t(array(string)),
    "strings": Js.Nullable.t(array(string)),
    "author": createConnectAuthor,
    "postTime": string
  };
    module Query = {
    type t = query;
    let typeName = "Query";
    
  let posts: field(t, array(post)) = getArray(~fieldName="posts", ~typeName);
  let authors: field(t, array(author)) = getArray(~fieldName="authors", ~typeName);
  };
  module Post = {
    type t = post;
    let typeName = "Post";
    
  let content: field(t, string) = getString(~fieldName="content", ~typeName);
  let title: field(t, option(string)) = getNullableString(~fieldName="title", ~typeName);
  let status: field(t, postStatus_enum) = getEnum(~fieldName="status", ~typeName, ~decoder=postStatus_enumFromJs);
  let statuses: field(t, array(postStatus_enum)) = getArray(~fieldName="statuses", ~typeName, ~decoder=
        decodeEnum(
          ~fieldName="statuses",
          ~typeName,
          ~decoder=postStatus_enumFromJs,
        ));
  let nullableStatus: field(t, option(postStatus_enum)) = getNullableEnum(~fieldName="nullableStatus", ~typeName, ~decoder=postStatus_enumFromJs);
  let author: field(t, author) = getField(~fieldName="author", ~typeName);
  let meta: field(t, option(postMeta)) = getNullableField(~fieldName="meta", ~typeName);
  let type_: field(t, option(string)) = getNullableString(~fieldName="type", ~typeName);
  };
  module Author = {
    type t = author;
    let typeName = "Author";
    
  let firstName: field(t, string) = getString(~fieldName="firstName", ~typeName);
  let lastName: field(t, option(string)) = getNullableString(~fieldName="lastName", ~typeName);
  let age: field(t, float) = getFloat(~fieldName="age", ~typeName);
  let posts: field(t, array(post)) = getArray(~fieldName="posts", ~typeName);
  let postMetas: field(t, option(array(postMeta))) = getNullableArray(~fieldName="postMetas", ~typeName);
  let nullablePosts: field(t, array(option(post))) = getArray(~fieldName="nullablePosts", ~typeName);
  let numPosts: field(t, option(float)) = getNullableFloat(~fieldName="numPosts", ~typeName);
  let height: field(t, float) = getFloat(~fieldName="height", ~typeName);
  let weight: field(t, option(float)) = getNullableFloat(~fieldName="weight", ~typeName);
  let isActive: field(t, bool) = getBool(~fieldName="isActive", ~typeName);
  let hasLoggedIn: field(t, option(bool)) = getNullableBool(~fieldName="hasLoggedIn", ~typeName);
  };
  module PostMeta = {
    type t = postMeta;
    let typeName = "PostMeta";
    
  let published: field(t, string) = getString(~fieldName="published", ~typeName);
  };
    module CreateAuthorInput = {
    type t = createAuthorInput;
    let make = (~firstName, ~lastName=?, ()): t => {
      "firstName": firstName,"lastName": lastName->Js.Nullable.fromOption
    }
  };
  module AuthorWhereUniqueInput = {
    type t = authorWhereUniqueInput;
    let make = (~firstName, ()): t => {
      "firstName": firstName
    }
  };
  module CreateConnectAuthor = {
    type t = createConnectAuthor;
    let make = (~connect=?, ~create=?, ()): t => {
      "connect": connect->Js.Nullable.fromOption,"create": create->Js.Nullable.fromOption
    }
  };
  module CreatePostInput = {
    type t = createPostInput;
    let make = (~title=?, ~content, ~status, ~maybeStatus=?, ~statuses=?, ~strings=?, ~author, ~postTime, ()): t => {
      "title": title->Js.Nullable.fromOption,"content": content,"status": status->postStatus_enumToJs,"maybeStatus": maybeStatus->Belt.Option.map(postStatus_enumToJs)->Js.Nullable.fromOption,"statuses": statuses->Belt.Option.map(Array.map(postStatus_enumToJs))->Js.Nullable.fromOption,"strings": strings->Js.Nullable.fromOption,"author": author,"postTime": postTime
    }
  };
  