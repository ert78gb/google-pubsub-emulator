# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [4.0.0](https://github.com/ert78gb/google-pubsub-emulator/compare/v3.0.2...v4.0.0) (2020-09-05)


### ⚠ BREAKING CHANGES

* supported node 10+
fs-extra dropped older then node 10 support

### Bug Fixes

* update fs-extra => 9.0.1 ([#24](https://github.com/ert78gb/google-pubsub-emulator/issues/24)) ([3f27a6c](https://github.com/ert78gb/google-pubsub-emulator/commit/3f27a6cd8fa277b960b454d55b53b4b6fd92871d))

### [3.0.2](https://github.com/ert78gb/google-pubsub-emulator/compare/v3.0.1...v3.0.2) (2020-02-17)


### Bug Fixes

* upgrade fs-extra => 8.1.0 ([9c92437](https://github.com/ert78gb/google-pubsub-emulator/commit/9c924374055e2abc859efbe8a1298e55df3716b5))

## [3.0.1](https://github.com/ert78gb/google-pubsub-emulator/compare/v3.0.0...v3.0.1) (2019-06-04)


### Bug Fixes

* **deps:** upgrade @google-cloud/pubsub => 0.28.1 ([19490d0](https://github.com/ert78gb/google-pubsub-emulator/commit/19490d0))
* use regexp to detect emulator running or not ([e91bcb3](https://github.com/ert78gb/google-pubsub-emulator/commit/e91bcb3))



<a name="3.0.0"></a>
# [3.0.0](https://github.com/ert78gb/google-pubsub-emulator/compare/v2.0.4...v3.0.0) (2018-12-05)


### Bug Fixes

* PubSub is not a constructor ([#13](https://github.com/ert78gb/google-pubsub-emulator/issues/13)) ([a3adefd](https://github.com/ert78gb/google-pubsub-emulator/commit/a3adefd)), closes [#12](https://github.com/ert78gb/google-pubsub-emulator/issues/12)



<a name="2.0.4"></a>
## [2.0.4](https://github.com/ert78gb/google-pubsub-emulator/compare/v2.0.3...v2.0.4) (2018-11-11)


### Bug Fixes

* **deps:** mocha-appveyor-reporter => 0.4.2 ([6d2f723](https://github.com/ert78gb/google-pubsub-emulator/commit/6d2f723))
* **deps:** upgrade [@google-cloud](https://github.com/google-cloud)/pubsub => 0.20.1 ([76bf4a9](https://github.com/ert78gb/google-pubsub-emulator/commit/76bf4a9))



<a name="2.0.3"></a>
## 2.0.3 (2018-11-11)


### Bug Fixes

* bluebird dependency ([#9](https://github.com/ert78gb/google-pubsub-emulator/issues/9)) ([990fe30](https://github.com/ert78gb/google-pubsub-emulator/commit/990fe30))
* Promise handling ([2fed042](https://github.com/ert78gb/google-pubsub-emulator/commit/2fed042))
* use localhost and random port when these not provided in options ([#8](https://github.com/ert78gb/google-pubsub-emulator/issues/8)) ([10de00d](https://github.com/ert78gb/google-pubsub-emulator/commit/10de00d))


### Features

* Create not exists topic when emulator start. ([9dfb9b9](https://github.com/ert78gb/google-pubsub-emulator/commit/9dfb9b9))
