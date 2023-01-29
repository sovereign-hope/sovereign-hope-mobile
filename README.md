<p align="center">
  <img src="assets/icon.png" width="250" alt="Sovereign Hope Logo" />
</p>
<h1 align="center">
  Sovereign Hope Mobile
</h1>
<h2 align="center">
  Sovereign Hope's mobile (iOS and Android) application code.
</h2>
<p align="center">
  <img src="https://github.com/sovereign-hope/sovereign-hope-mobile/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI Badge" />
</p>

## 🔍 Overview

The Sovereign Hope mobile application is a React Native application.

In addition to using the React Native framework, we leverage Expo to simplify our build pipelines even further.

More information on Expo [here.](https://expo.io/)

We use Github Actions for our CI/CD pipelines; more info on those later.

If you're here to quickly get the app up and running, for whatever reason, head over to [the Quick Start guide.](#quick-start)
Otherwise, if you're onboarding as a new mobile engineer or simply want to be thorough, head over to [the Full Mobile Onboarding guide.](#full-mobile-onboarding)

## 💨 Quick Start

To view and run the most recent Development release channel on your device:

1. Dowload the "Expo Go" app on the App Store or the Play Store
2. Click [this link] to view the project page for the Development release channel
3. From your phone, scan the QR code on the project page and open the link in Expo Go

Note: If your using your phone, you can click the link above directly and skip scanning the code.

## 📱 Full Mobile Onboarding

Let's get right to business.

### 1️⃣ Preleminary Installs

First thing is installs-- let's get all these out of the way so that we can focus on learning and configuration.

Note: If you use `zsh`, just substitute it in for any occurence of `bash`

Note Note: Since MacOS 10.15, the default shell is `zsh`

Here's what we're going to install, in order:

#### 🍺 Homebrew

```bash
sh /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 🛠 xcode-install and Xcode

```bash
gem install xcode-install
xcversion install 12.5
```

Note: This installs Xcode 12.5, but you should be able to install the most recent version. This will be the case _unless we eject from the Managed Expo Workflow_.

If you want to install the most recent Xcode _and we haven't eject from the Managed Workflow_, just:

```bash
xcversion list
```

and then `xcversion install` whatever the latest version is.

In case you're having trouble, [the xcode-install repository can be found here.](https://github.com/xcpretty/xcode-install)

This takes a while and would be a great time to review some [required reading](#required-reading)

Don't install `nvm` until Xcode is finished installing-- the Xcode command line tools are required.

#### 💼 nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
```

Now run the following to verify that `nvm` was installed properly:

```bash
command -v nvm
```

If the above command gives you a version, you're in. If not, [check out the official documentation.](https://github.com/nvm-sh/nvm#installing-and-updating)
We'll install the version of Node we need, along with `yarn` in a bit.

#### 🤖 Android Studio

[Get it here.](https://developer.android.com/studio)

Once again, version shouldn't matter.

Note: The main reason we're installing this (and Xcode, in some ways) is both _just in case_ and also for using the simulators.

#### ⌨️ VSCode

This is what we'll use for most of the React Native development. You can [download it here.](https://code.visualstudio.com/download)
If you have a preferred text editor, feel free to use it, but VSCode has a lot of extensions that really will make your life easier and ensure that we're all on the same page.

You should deffinitely install the `Expo Tools`, `ESLint`, `Prettier` extensions to assist with automatic code formatting (on save).
Note: Make sure you choose a formatter later on-- you should receive a notification in VSCode when you start editing code. Choose `Prettier`.

Other extensions I would recommend:

- GitLens
- React/Redux/react-router Snippets
- Typescript React code snippets
- VSCode React Refactor

#### ↕️ Android File Transfer

[Download it here.](https://www.android.com/filetransfer/)

Install it.

#### 🟢 Expo Go

Here's one that you'll need to pick up a mobile device for.

Either grab your every-day-carry or a spare phone, it doesn't matter either way.

Head to the App Store or Play Store and search for "Expo Go". Download it.

This is a neat app to accomodate the development cycle with Expo; you can [learn more here.](https://expo.io/client)

#### 🦸 SDKMAN! and Java

```bash
curl -s "https://get.sdkman.io" | bash
```

Follow the instructions on-screen to complete installation.
Next, open a new terminal or enter:

```bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
```

Lastly, run the following code snippet to ensure that installation succeeded:

```bash
sdk version
```

If all went well, the version should be displayed. If you have any trouble, refer to the [official docs here.](https://sdkman.io/install)

Now, install a couple versions of Java.

```bash
sdk install java 16.0.1-open
```

and

```bash
sdk install java 8.0.292-zulu
```

The second JDK is required should you ever need to jump into the Android command line SDK.

#### 🪲 React Native Debugger

We can install this one via homebrew:

```bash
brew install --cask react-native-debugger
```

After firing up React Native Debugger, you'll need to specify the port (shortcuts: Command+T on macOS) to 19000. After that, run your project with expo start, and select Debug remote JS from the Developer Menu. The debugger should automatically connect.

For more information on debugging with the React Native Debugger, [visit this page.](https://github.com/jhen0409/react-native-debugger#documentation)

### 2️⃣ Getting the code

The next step is to clone the mobile repository onto your machine. This would be a good time to make sure you have your favorite Git client installed or just pop open your terminal and:

```bash
git clone git@github.com:sovereign-hope/sovereign-hope-mobile.git
```

Tip: A greate place to put your repos on a Mac system is in `~/Developer`. The folder gets a special little icon and you can pop that bad boy into the Finder side bar.

Once the repo is cloned, open your terminal if you haven't already and `cd` into the project directory.

### 3️⃣ Secondary Install

#### 🧶 Node and yarn

Since we've already installed `nvm`, all that is necessary is:

```bash
nvm install && nvm use
```

When that's completed, you'll have the correct version of Node installed and configured to run in the project directory.

All that's left to do is install yarn:

```bash
npm i -g yarn
```

With that done, go ahead and install the app dependencies with:

```bash
yarn
```

#### 🏗 Expo and EAS CLI

```bash
npm i -g expo-cli eas-cli
```

Information on these tools can be found [here](https://docs.expo.io/workflow/expo-cli/) and [here](https://www.npmjs.com/package/eas-cli)

### ▶️ Running the App

With everything set up, get your phone ready with the Expo Go app running and, from the project directory, run:

```bash
expo start
```

or

```bash
yarn start
```

When the app builds and the bundler launches, you'll receive console output that includes a scannable QR code, some information on the build, and some command options (including options to run in the simulators).
Additionally, the bundler will open the Expo developer tools in your browser with some of the same information.

Simply scan the QR code in Expo Go to work with the build, or if you've already added the local project to Expo Go on your phone, just open Expo Go and tap on the "Sovereign Hope" project located on your device.

From here you can simply begin updating code and receive live updates on your device.

### 🦾 Github Workflows

We use Github Action Workflows to manage our CI/CD processes.

These workflows are managed by workflow YAML files in the `.github/workflows` directory. A little more color will be added to this in the [Release Cycle](#release-cycle) and [Development Process](#development-process) sections.

### 🤓 Development Process

Branch names should include the following prefixes:

- `/feature` for feature branches
- `/hotfix` for urgent bug fix branches
- `/bugfix` for non-urgent bug fix branches
- `/release` for release candidate branches

Examples:

`/feature/cool-new-feature`

`/hotfix/urgent-new-bug-fix`

When work on a branch is complete, a PR should be submitted against `main`, which is our main trunk branch.
Given the nature of our continuous deployment capabilities, we don't employ a secondary `development` branch, but rather all work is done off of `main`. This keeps things running much more smoothly in our case and eliminates a lot of unnecessary complexity.

PR branches, as a part of our CI/CD pipeline, will generate a PR-specific expo build that you can quickly and easily run on any device and share with coworkers to test. A link will be added to your PR when the build finishes.

When a PR passes necessary checks and reviews, it can be merged to `main` at any point. Because we tag the branches with Jira keys, the ticket related to your branch should update as well.

Once a PR is merged into main, a new development build will be triggered and deployed to the `development` Expo release channel. New development app binaries will also be built for internal distribution.

You can and should read more about Expo release channels and EAS (Expo App Services) [here](https://docs.expo.io/distribution/release-channels/) and [here](https://docs.expo.io/build/introduction/).

### 🧪 Testing

We use Jest for our unit and integration tests. In order to run all the tests, run:

```bash
yarn test
```

If you're working on some covered code or writing new tests runthe following to only test what has changed:

```bash
yarn testChanged
```

Other scripts can be found in `package.json`.

We don't currently perform E2E tests.

### 🚀 Release Cycle

We use Github actions to automate most of the pipeline.
Refer back to [Github Workflows](#github-workflows) to review the flow charts.

The release process should proceed as follows:

1. Create a release branch in Github (release/v#.#.#)
2. The branch creation will automatically kick off the Realease Candidate Workflow
3. Bump the Expo and EAS versions on the main branch
4. Tag release branch with the version tag, kicking off the Production Release workflow
5. If this is a major release, release binaries to the App and Play Stores.
6. Monitor errors via Sentry-- create hotfixes if needed.

### 📚 Helpful Reading

[Apple's Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)

[Google's Material Design Guidelines](https://material.io/design/introduction)

[Accessiblity]()

[React Native Performance]()
