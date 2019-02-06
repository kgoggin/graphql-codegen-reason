workflow "New workflow" {
  on = "push"
  resolves = ["Build & Test"]
}

action "Build & Test" {
  uses = "./actions/build-test/"
}
