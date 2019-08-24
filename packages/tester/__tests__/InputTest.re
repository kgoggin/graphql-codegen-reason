open GraphQLTypes;

open Jest;

describe("generating input types", () =>
  test("it can create JS objects for input types", () => {
    let actual =
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
      );
    let expected: CreatePostInput.t = {
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
    Expect.(expect(actual) |> toEqual(expected));
  })
);
