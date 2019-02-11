workflow "On Push" {
  on = "push"
  resolves = ["Build & Test"]
}

workflow "On Release" {
  on = "release"
  resolves = ["Publish"]
}

action "Build & Test" {
  uses = "./actions/build-test/"
}

action "Publish" {
  uses = "actions/npm@master"
  args = "publish"
  secrets = ["NPM_AUTH_TOKEN"]
  needs = ["Build & Test"]
}
