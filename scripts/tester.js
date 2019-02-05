const { generate } = require("graphql-code-generator");

async function generateTypes() {
  try {
    const generatedFiles = await generate(
      {
        schema: "http://localhost:4000/",
        overwrite: true,
        documents: "../re/**/*.graphql",
        generates: {
          [process.cwd() + "/re/"]: {
            plugins: ["../lib/index.js"],
          },
        },
      },
      false,
    );
    console.log(generatedFiles);
  } catch (err) {
    throw err;
  }
}

generateTypes();
