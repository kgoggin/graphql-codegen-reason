#!/bin/sh

set -e

# install dependencies
yarn

# build ts files
yarn build:ts

# generate code from test schema
yarn generate

# build re files
yarn build:re

# run unit tests
yarn test
