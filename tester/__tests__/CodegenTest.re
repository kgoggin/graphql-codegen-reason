open GraphQLTypes;

open Jest;

describe("codegen", () => {
  describe("Scalars", () => {
    describe("String", () => {
      test("it can parse scalar strings", () => {
        let data = {|
                 {"__typeName": "Query", "authors": [{"__typeName": "Author", "firstName": "Fred"}]}
               |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(expect(authors[0]->Author.firstName) |> toBe("Fred"));
      });

      test("it can parse nullable scalar strings that are non-null", () => {
        let data = {|
                     {"__typeName": "Query", "authors": [{"__typeName": "Author", "lastName": "Fredrickson"}]}
                   |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(
          expect(
            authors[0]->Author.lastName->Belt.Option.getWithDefault("null"),
          )
          |> toBe("Fredrickson")
        );
      });

      test("it can parse nullable scalar strings that are null", () => {
        let data = {|
                       {"__typeName": "Query", "authors": [{"__typeName": "Author", "lastName": null}]}
                     |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(
          expect(
            authors[0]->Author.lastName->Belt.Option.getWithDefault("null"),
          )
          |> toBe("null")
        );
      });
    });

    describe("Int", () => {
      test("it can parse scalar ints", () => {
        let data = {|
                   {"__typeName": "Query", "authors": [{"__typeName": "Author", "age": 37}]}
                 |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(expect(authors[0]->Author.age) |> toBe(37.));
      });

      test("it can parse nullable scalar ints that are non-null", () => {
        let data = {|
                     {"__typeName": "Query", "authors": [{"__typeName": "Author", "numPosts": 12}]}
                   |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(
          expect(authors[0]->Author.numPosts->Belt.Option.getWithDefault(0.))
          |> toBe(12.)
        );
      });

      test("it can parse nullable scalar ints that are non-null", () => {
        let data = {|
                       {"__typeName": "Query", "authors": [{"__typeName": "Author", "numPosts": null}]}
                     |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(
          expect(authors[0]->Author.numPosts->Belt.Option.getWithDefault(0.))
          |> toBe(0.)
        );
      });
    });

    describe("Float", () => {
      test("it can parse scalar floats", () => {
        let data = {|
                           {"__typeName": "Query", "authors": [{"__typeName": "Author", "height": 34.3}]}
                         |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(expect(authors[0]->Author.height) |> toBe(34.3));
      });

      test("it can parse nullable scalar floats that are non-null", () => {
        let data = {|
                             {"__typeName": "Query", "authors": [{"__typeName": "Author", "weight": 100.3}]}
                           |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(
          expect(authors[0]->Author.weight->Belt.Option.getWithDefault(0.))
          |> toBe(100.3)
        );
      });

      test("it can parse nullable scalar floats that are non-null", () => {
        let data = {|
                               {"__typeName": "Query", "authors": [{"__typeName": "Author", "weight": null}]}
                             |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(
          expect(authors[0]->Author.weight->Belt.Option.getWithDefault(0.))
          |> toBe(0.)
        );
      });
    });

    describe("Boolean", () => {
      test("it can parse scalar booleans", () => {
        let data = {|
                                 {"__typeName": "Query", "authors": [{"__typeName": "Author", "isActive": true}]}
                               |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(expect(authors[0]->Author.isActive) |> toBe(true));
      });

      test("it can parse nullable scalar booleans that are non-null", () => {
        let data = {|
                                   {"__typeName": "Query", "authors": [{"__typeName": "Author", "hasLoggedIn": false}]}
                                 |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(
          expect(
            authors[0]->Author.hasLoggedIn->Belt.Option.getWithDefault(true),
          )
          |> toBe(false)
        );
      });

      test("it can parse nullable scalar booleans that are non-null", () => {
        let data = {|
                                     {"__typeName": "Query", "authors": [{"__typeName": "Author", "hasLoggedIn": null}]}
                                   |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(
          expect(
            authors[0]->Author.hasLoggedIn->Belt.Option.getWithDefault(false),
          )
          |> toBe(false)
        );
      });
    });
  });

  describe("Nested types", () => {
    test("can access a nested type", () => {
      let data = {|
                       {"__typeName": "Query", "posts": [{"__typeName": "Post", "author": {
                         "__typeName": "Author", "firstName": "Fred"
                       }}]}
                     |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(
        expect(posts[0]->Post.author->Author.firstName) |> toBe("Fred")
      );
    });

    test("can access a nested nullable type that isn't null", () => {
      let data = {|
                           {"__typeName": "Query", "posts": [{"__typeName": "Post", "meta": {
                             "__typeName": "PostMeta", "published": "Friday"
                           }}]}
                         |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(
        expect(posts[0]->Post.meta->Belt.Option.getExn->PostMeta.published)
        |> toBe("Friday")
      );
    });

    test("can access a nested nullable type that is null", () => {
      let data = {|
                               {"__typeName": "Query", "posts": [{"__typeName": "Post", "meta": null}]}
                             |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(expect(posts[0]->Post.meta) |> toBe(None));
    });

    describe("Arrays of nested types", () => {
      test("can access an array of nested types", () => {
        let data = {|
          {"__typeName": "Query", "authors": [{"__typeName": "Author", "posts": [{"__typeName": "Post", "content": "hey"}]}]}
        |};

        let author = data->Js.Json.parseExn->Query.authors[0];
        Expect.(
          expect(author->Author.posts[0]->Post.content) |> toBe("hey")
        );
      });

      test("can access a nullable array of nested types", () => {
        let data = {|
                  {"__typeName": "Query", "authors": [{"__typeName": "Author", "postMetas": [{"__typeName": "PostMeta", "published": "hey"}]}]}
                |};

        let author = data->Js.Json.parseExn->Query.authors[0];
        Expect.(
          expect(
            author->Author.postMetas->Belt.Option.getExn[0]
            ->PostMeta.published,
          )
          |> toBe("hey")
        );
      });
      test("can access an array of nested nullable types", () => {
        let data = {|
          {"__typeName": "Query", "authors": [{"__typeName": "Author", "nullablePosts": [{"__typeName": "Post", "content": "hey"}]}]}
        |};

        let author = data->Js.Json.parseExn->Query.authors[0];
        Expect.(
          expect(
            author->Author.nullablePosts[0]->Belt.Option.getExn->Post.content,
          )
          |> toBe("hey")
        );
      });
    });
  });

  describe("Enums", () => {
    test("can parse enum values", () => {
      let data = {|
        {"__typeName": "Query", "posts": [{"__typeName": "Post", "status": "PUBLISHED"}]}
      |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(expect(posts[0]->Post.status) |> toEqual(`PUBLISHED));
    });

    test("can parse nullable enum values that aren't null", () => {
      let data = {|
        {"__typeName": "Query", "posts": [{"__typeName": "Post", "nullableStatus": "PUBLISHED"}]}
      |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(
        expect(posts[0]->Post.nullableStatus) |> toEqual(Some(`PUBLISHED))
      );
    });

    test("can parse nullable enum values that are null", () => {
      let data = {|
        {"__typeName": "Query", "posts": [{"__typeName": "Post", "nullableStatus": null}]}
      |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(expect(posts[0]->Post.nullableStatus) |> toEqual(None));
    });

    test("can parse an array of enums", () => {
      let data = {|
        {"__typeName": "Query", "posts": [{"__typeName": "Post", "statuses": ["PUBLISHED"]}]}
      |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(expect(posts[0]->Post.statuses[0]) |> toEqual(`PUBLISHED));
    });
  });

  describe("naming collisions", () =>
    test("handles fields named 'type'", () => {
      let data = {|
        {"__typeName": "Query", "posts": [{"__typeName": "Post", "type": "foo"}]}
      |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(expect(posts[0]->Post.type_) |> toEqual(Some("foo")));
    })
  );
});
