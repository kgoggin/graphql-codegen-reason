open GraphQLTypes;

open Jest;

describe("generating types for Queries", () =>
  test("it can create JS objects for query arguments", () => {
    let actual =
      Queries.MyTestQuery.makeVariables(
        ~title="Test",
        ~status=`PUBLISHED,
        (),
      );
    let expected: Queries.MyTestQuery.variables = {
      "title": "Test",
      "status": Js.Nullable.return("PUBLISHED"),
    };
    Expect.(expect(actual) |> toEqual(expected));
  })
);

describe("generating types for Mutations", () =>
  test("it can create JS objects for mutation arguments", () => {
    let actual =
      Mutations.CreatePost.makeVariables(
        ~data=
          CreatePostInput.make(
            ~title="Test",
            ~content="foo",
            ~status=`PUBLISHED,
            ~statuses=[|`PUBLISHED|],
            ~postTime="huh",
            ~author=
              CreateConnectAuthor.make(
                ~create=CreateAuthorInput.make(~firstName="Fred", ()),
                (),
              ),
            (),
          ),
        (),
      );
    let expectedPost: CreatePostInput.t = {
      "title": Js.Nullable.return("Test"),
      "content": "foo",
      "status": "PUBLISHED",
      "maybeStatus": Js.Nullable.undefined,
      "statuses": Js.Nullable.return([|"PUBLISHED"|]),
      "strings": Js.Nullable.undefined,
      "postTime": "huh",
      "author": {
        "connect": Js.Nullable.undefined,
        "create":
          Js.Nullable.return({
            "firstName": "Fred",
            "lastName": Js.Nullable.undefined,
          }),
      },
    };
    let expected: Mutations.CreatePost.variables = {"data": expectedPost};
    Expect.(expect(actual) |> toEqual(expected));
  })
);
