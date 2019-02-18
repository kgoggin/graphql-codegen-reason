open GraphQLTypes;

open Jest;

describe("parsing JSON", () => {
  describe("Scalars", () => {
    describe("String", () => {
      test("it can parse scalar strings", () => {
        let data = {|
                 {"__typename": "Query", "authors": [{"__typename": "Author", "firstName": "Fred"}]}
               |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(expect(authors[0]->Author.firstName) |> toBe("Fred"));
      });

      test("it can parse nullable scalar strings that are non-null", () => {
        let data = {|
                     {"__typename": "Query", "authors": [{"__typename": "Author", "lastName": "Fredrickson"}]}
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
                       {"__typename": "Query", "authors": [{"__typename": "Author", "lastName": null}]}
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
                   {"__typename": "Query", "authors": [{"__typename": "Author", "age": 37}]}
                 |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(expect(authors[0]->Author.age) |> toBe(37));
      });

      test("it can parse nullable scalar ints that are non-null", () => {
        let data = {|
                     {"__typename": "Query", "authors": [{"__typename": "Author", "numPosts": 12}]}
                   |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(
          expect(authors[0]->Author.numPosts->Belt.Option.getWithDefault(0))
          |> toBe(12)
        );
      });

      test("it can parse nullable scalar ints that are non-null", () => {
        let data = {|
                       {"__typename": "Query", "authors": [{"__typename": "Author", "numPosts": null}]}
                     |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(
          expect(authors[0]->Author.numPosts->Belt.Option.getWithDefault(0))
          |> toBe(0)
        );
      });
    });

    describe("Float", () => {
      test("it can parse scalar floats", () => {
        let data = {|
                           {"__typename": "Query", "authors": [{"__typename": "Author", "height": 34.3}]}
                         |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(expect(authors[0]->Author.height) |> toBe(34.3));
      });

      test("it can parse nullable scalar floats that are non-null", () => {
        let data = {|
                             {"__typename": "Query", "authors": [{"__typename": "Author", "weight": 100.3}]}
                           |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(
          expect(authors[0]->Author.weight->Belt.Option.getWithDefault(0.))
          |> toBe(100.3)
        );
      });

      test("it can parse nullable scalar floats that are non-null", () => {
        let data = {|
                               {"__typename": "Query", "authors": [{"__typename": "Author", "weight": null}]}
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
                                 {"__typename": "Query", "authors": [{"__typename": "Author", "isActive": true}]}
                               |};
        let authors = data->Js.Json.parseExn->Query.authors;
        Expect.(expect(authors[0]->Author.isActive) |> toBe(true));
      });

      test("it can parse nullable scalar booleans that are non-null", () => {
        let data = {|
                                   {"__typename": "Query", "authors": [{"__typename": "Author", "hasLoggedIn": false}]}
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
                                     {"__typename": "Query", "authors": [{"__typename": "Author", "hasLoggedIn": null}]}
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
                       {"__typename": "Query", "posts": [{"__typename": "Post", "author": {
                         "__typename": "Author", "firstName": "Fred"
                       }}]}
                     |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(
        expect(posts[0]->Post.author->Author.firstName) |> toBe("Fred")
      );
    });

    test("can access a nested nullable type that isn't null", () => {
      let data = {|
                           {"__typename": "Query", "posts": [{"__typename": "Post", "meta": {
                             "__typename": "PostMeta", "published": "Friday"
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
                               {"__typename": "Query", "posts": [{"__typename": "Post", "meta": null}]}
                             |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(expect(posts[0]->Post.meta) |> toBe(None));
    });

    describe("Arrays of nested types", () => {
      test("can access an array of nested types", () => {
        let data = {|
          {"__typename": "Query", "authors": [{"__typename": "Author", "posts": [{"__typename": "Post", "content": "hey"}]}]}
        |};

        let author = data->Js.Json.parseExn->Query.authors[0];
        Expect.(
          expect(author->Author.posts[0]->Post.content) |> toBe("hey")
        );
      });

      test("can access a nullable array of nested types", () => {
        let data = {|
                  {"__typename": "Query", "authors": [{"__typename": "Author", "postMetas": [{"__typename": "PostMeta", "published": "hey"}]}]}
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
          {"__typename": "Query", "authors": [{"__typename": "Author", "nullablePosts": [{"__typename": "Post", "content": "hey"}]}]}
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
        {"__typename": "Query", "posts": [{"__typename": "Post", "status": "PUBLISHED"}]}
      |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(expect(posts[0]->Post.status) |> toEqual(`PUBLISHED));
    });

    test("can parse nullable enum values that aren't null", () => {
      let data = {|
        {"__typename": "Query", "posts": [{"__typename": "Post", "nullableStatus": "PUBLISHED"}]}
      |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(
        expect(posts[0]->Post.nullableStatus) |> toEqual(Some(`PUBLISHED))
      );
    });

    test("can parse nullable enum values that are null", () => {
      let data = {|
        {"__typename": "Query", "posts": [{"__typename": "Post", "nullableStatus": null}]}
      |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(expect(posts[0]->Post.nullableStatus) |> toEqual(None));
    });

    test("can parse an array of enums", () => {
      let data = {|
        {"__typename": "Query", "posts": [{"__typename": "Post", "statuses": ["PUBLISHED"]}]}
      |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(expect(posts[0]->Post.statuses[0]) |> toEqual(`PUBLISHED));
    });
  });

  describe("naming collisions", () =>
    test("handles fields named 'type'", () => {
      let data = {|
        {"__typename": "Query", "posts": [{"__typename": "Post", "type": "foo"}]}
      |};
      let posts = data->Js.Json.parseExn->Query.posts;
      Expect.(expect(posts[0]->Post.type_) |> toEqual(Some("foo")));
    })
  );
});
