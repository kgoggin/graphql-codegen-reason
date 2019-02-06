workflow "New workflow" {
  on = "push"
  resolves = ["Run Unit Tests"]
}

action "Install bs-platform" {
  uses = "docker://culturehq/actions-yarn:latest"
  args = "global add bs-platform"
}

action "Install Dependencies" {
  uses = "docker://culturehq/actions-yarn:latest"
  args = "install"
  needs = ["Install bs-platform"]
}

action "Build TS Files" {
  uses = "docker://culturehq/actions-yarn:latest"
  runs = "build:ts"
  needs = ["Install Dependencies"]
}

action "Generate Test Schema Code" {
  uses = "docker://culturehq/actions-yarn:latest"
  runs = "generate"
  needs = ["Build TS Files"]
}

action "Build Reason Code" {
  uses = "docker://culturehq/actions-yarn:latest"
  runs = "build:re"
  needs = ["Generate Test Schema Code"]
}

action "Run Unit Tests" {
  uses = "docker://culturehq/actions-yarn:latest"
  needs = ["Build Reason Code"]
  args = "test"
}
