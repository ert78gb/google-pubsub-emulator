const PORT_ALREADY_IN_USE = '[pubsub] Exception in thread "main" java.io.IOException: Failed to bind';
const DEFAULT_OPTIONS = {
  clean: true,
  debug: false
};

const EmulatorStates = require('./emulator-states');
const spawn = require('child_process').spawn;
const EventEmitter = require('events');
const fse = require('fs-extra');
const kill = require('tree-kill');
const nodeCleanup = require('node-cleanup');
const getPort = require('get-port');

const {getPortNumber} = require('./get-port-number');

class PubSubStateEmitter extends EventEmitter{
}

class PubSubEmulator{

  constructor (options) {
    this._emulator = null;
    this._options = {};
    this._options = Object.assign(this._options, DEFAULT_OPTIONS, options);

    this._emulator_port = null;
    this._state = null;
    this._stateEmitter = new PubSubStateEmitter();
    this._pubsub = null;
    this._portAlreadyInUse = false;

    const self = this;

    /* istanbul ignore next */
    nodeCleanup(() => {
      self.stop();
      nodeCleanup.uninstall();
      return false;
    });
  }

  start () {
    const self = this;
    this._portAlreadyInUse = false;

    return this._createDataDirSync()
      .then(()=> this._getCommandParameters())
      .then(params => {
        return new Promise((resolve, reject) => {
          if (this._state)
            return reject(new Error('PubSub emulator is already running.'));

          self._emulator = spawn('gcloud', params, {shell: true});

          self._registerEmulatorListeners();

          function startSuccessListener () {
            removeStartListeners();
            self._createTopics()
              .then(() => {
                resolve();
              }).catch(reject);
          }

          function startRejectListener (error) {
            removeStartListeners();
            if (self._portAlreadyInUse) {
              const port = `${self._options.port || ''} `;
              return reject(new Error(`Port:${port}already in use.`));
            }

            reject(error || new Error('Unexpected error. Emulator exited.'));
          }

          function removeStartListeners () {
            self._stateEmitter.removeListener(EmulatorStates.RUNNING, startSuccessListener.bind(self));

            self._stateEmitter.removeListener(EmulatorStates.EXIT, startRejectListener.bind(self));

            self._stateEmitter.removeListener(EmulatorStates.CLOSE, startRejectListener.bind(self));
          }

          self._stateEmitter.on(EmulatorStates.RUNNING, startSuccessListener.bind(self));

          self._stateEmitter.on(EmulatorStates.EXIT, startRejectListener.bind(self));

          self._stateEmitter.on(EmulatorStates.CLOSE, startRejectListener.bind(self));

        });
      });
  }

  stop () {

    if (this._state !== EmulatorStates.RUNNING)
      return Promise.resolve();

    const self = this;

    return new Promise((resolve, reject) => {
      let resolved = false;
      let cleaned = false;
      let killed = false;

      function exitedSubStep () {
        if (cleaned && killed)
          resolve();
      }

      function stopListener () {
        if (resolved)
          return;

        resolved = true;
        this._emulator_port = null;
        removeStopListeners();
        self._removeEmulatorListeners();
        return self._clean()
          .then(() => {
            cleaned = true;
            exitedSubStep();
          })
          .catch(reject);
      }

      function removeStopListeners () {
        self._stateEmitter.removeListener(EmulatorStates.EXIT, stopListener.bind(this));

        self._stateEmitter.removeListener(EmulatorStates.CLOSE, stopListener.bind(this));
      }

      this._stateEmitter.on(EmulatorStates.EXIT, stopListener.bind(this));

      this._stateEmitter.on(EmulatorStates.CLOSE, stopListener.bind(this));

      kill(this._emulator.pid, (err) => {
        killed = true;
        if (err)
          return reject(err);

        exitedSubStep();
      });
    });
  }

  _processStd (data) {
    const text = data.toString();

    const portNumber = getPortNumber(text);
    if (portNumber) {
      this._emulator_port = portNumber;

      this._setEnviromentVariables();
      this._setState(EmulatorStates.RUNNING);
    }

    if (text.includes(PORT_ALREADY_IN_USE) > -1)
      this._portAlreadyInUse = true;
  }

  _getCommandParameters () {
    return getPort({port: 8538})
      .then(defaultPort => {

        const params = ['beta', 'emulators', 'pubsub', 'start'];

        if (this._options.project) {
          params.push('--project=' + this._options.project);
        }

        if (this._options.host && this._options.port) {
          params.push(`--host-port=${this._options.host}:${this._options.port}`);
        }
        else if (!this._options.host && this._options.port) {
          params.push(`--host-port=localhost:${this._options.port}`);
        }
        else if (this._options.host && !this._options.port) {
          throw new Error('If you set host you need to set port.');
        }
        else {
          params.push(`--host-port=localhost:${defaultPort}`);
        }

        if (this._options.dataDir) {
          params.push('--data-dir=' + this._options.dataDir);
        }

        if (this._options.debug) {
          params.push('--user-output-enabled');
          params.push('--log-http');
          params.push('--verbosity=debug');
        }

        return params;
      });
  }

  _writeDebug (message) {
    if (!this._options.debug)
      return;

    console.log(message);
  }

  _setState (newState, params) {
    this._state = newState;
    this._stateEmitter.emit(newState, params);
  }

  _setEnviromentVariables () {
    let env = this._options.host ? this._options.host : 'localhost';

    env += ':' + this._emulator_port;

    process.env.PUBSUB_EMULATOR_HOST = env;

    if (this._options.project)
      process.env.GCLOUD_PROJECT = this._options.project;
  }

  _registerEmulatorListeners () {
    this._emulator.stdout.on('data', this._emulatorStdOutListener.bind(this));

    this._emulator.stderr.on('data', this._emulatorStdErrListener.bind(this));

    this._emulator.on('close', this._emulatorCloseListener.bind(this));

    this._emulator.on('exit', this._emulatorExitListener.bind(this));

    this._emulator.on('error', this._emulatorErrorListener.bind(this));
  }

  _removeEmulatorListeners () {
    this._emulator.stdout.removeListener('data', this._emulatorStdOutListener.bind(this));

    this._emulator.stderr.removeListener('data', this._emulatorStdErrListener.bind(this));

    this._emulator.removeListener('close', this._emulatorCloseListener.bind(this));

    this._emulator.removeListener('exit', this._emulatorExitListener.bind(this));

    this._emulator.removeListener('error', this._emulatorErrorListener.bind(this));

  }

  _emulatorStdOutListener (data) {
    this._writeDebug(`stdout: ${data}`);
    this._processStd(data);
  }

  _emulatorStdErrListener (data) {
    this._writeDebug(`stderr: ${data}`);
    this._processStd(data);
  }

  _emulatorCloseListener (code) {
    this._writeDebug(`child process close with code ${code}`);
    this._setState(EmulatorStates.CLOSE, code);
  }

  _emulatorExitListener (code) {
    this._writeDebug(`child process exit with code ${code}`);
    this._setState(EmulatorStates.EXIT, code);
  }

  _emulatorErrorListener (err) {
    this._writeDebug(`child process error: ${err}`);
    this._setState(EmulatorStates.ERROR, err);
  }

  _clean () {
    if (!this._options.clean)
      return Promise.resolve();

    if (!this._options.dataDir)
      return Promise.resolve();

    return fse.remove(this._options.dataDir);
  }

  _createDataDirSync () {
    if (this._options.dataDir)
      return fse.ensureDir(this._options.dataDir);

    return Promise.resolve();
  }

  _getPubSubClient (options) {
    if (this._pubsub === null) {
      const {PubSub} = require('@google-cloud/pubsub');
      options = options || {};
      this._pubsub = new PubSub(options);
    }

    return this._pubsub;
  }

  _createTopics () {
    if (!this._options.topics || this._options.topics.length < 1)
      return Promise.resolve();

    const pubsub = this._getPubSubClient();
    return Promise.all(this._options.topics.map(topic => this.isTopicExists(topic)))
      .then((result => {
          return Promise.all(result
            .filter(topic => !topic.exists)
            .map(topic => pubsub.topic(topic.topicName).create())
          );
        })
      );
  }

  isTopicExists (topicName) {
    const pubsub = this._getPubSubClient();
    return pubsub.topic(topicName).exists()
      .then((result) => {
        return Promise.resolve({
          topicName,
          exists: result[0]
        });
      });
  }
}

module.exports = PubSubEmulator;
