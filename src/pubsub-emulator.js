const PUBSUB_EMULATOR_RUNNING_KEY = '[pubsub] INFO: Server started, listening on ';
const DEFAULT_OPTIONS = {
    clean: true,
    debug: false
};

const Promise = require('bluebird');
const EmulatorStates = require('./emulator-states');
const spawn = require('child_process').spawn;
const EventEmitter = require('events');
const fse = require('fs-extra-promise').usePromise(Promise);
const kill = require('tree-kill');

class PubSubStateEmitter extends EventEmitter {
}

class PubSubEmulator {

    constructor(options) {
        this._emulator = null;
        this._options = {};
        this._options = Object.assign(this._options, DEFAULT_OPTIONS, options);

        this._emulator_port = null;
        this._state = null;
        this._stateEmitter = new PubSubStateEmitter();
        this._pubsub = null;

        const self = this;

        /* istanbul ignore next */
        process.on('exit', () => {
            self.stop();
        });
    }

    start() {
        const self = this;

        return new Promise((resolve, reject) => {

            if (this._state)
                throw new Error('PubSub emulator is already running.');

            const params = this._getCommandParameters();
            self._emulator = spawn('gcloud', params, { shell: true });

            self._registerEmulatorListeners();


            function startSuccessListener() {
                removeStartListeners();
                self._pubsub = require('@google-cloud/pubsub')();
                self._createTopics()
                    .then(() => {
                        resolve();

                    })
            }

            function startRejectListener(error) {
                removeStartListeners();
                reject(error);
            }

            function removeStartListeners() {
                self._stateEmitter.removeListener(EmulatorStates.RUNNING, startSuccessListener.bind(this));

                // self._stateEmitter.removeListener(EmulatorStates.EXIT, startRejectListener.bind(this));

                self._stateEmitter.removeListener(EmulatorStates.CLOSE, startRejectListener.bind(this));
            }

            self._stateEmitter.on(EmulatorStates.RUNNING, startSuccessListener.bind(this));

            // self._stateEmitter.on(EmulatorStates.EXIT, startRejectListener.bind(this));

            self._stateEmitter.on(EmulatorStates.CLOSE, startRejectListener.bind(this));

        })

    }

    stop() {

        if (this._state !== EmulatorStates.RUNNING)
            return Promise.resolve();

        const self = this;

        return new Promise((resolve) => {
            let resolved = false;

            function stopListener() {
                if (resolved)
                    return;

                resolved = true;
                this._emulator_port = null;
                removeStopListeners();
                self._removeEmulatorListeners();
                return self._clean()
                    .then(resolve);
            }

            function removeStopListeners() {
                self._stateEmitter.on(EmulatorStates.EXIT, stopListener.bind(this));

                self._stateEmitter.on(EmulatorStates.CLOSE, stopListener.bind(this));
            }

            this._stateEmitter.on(EmulatorStates.EXIT, stopListener.bind(this));

            this._stateEmitter.on(EmulatorStates.CLOSE, stopListener.bind(this));

            kill(this._emulator.pid);
        })
    }

    _processStd(data) {
        const text = data.toString();

        if (text.indexOf(PUBSUB_EMULATOR_RUNNING_KEY) > -1) {
            let s = text.substring(text.lastIndexOf(PUBSUB_EMULATOR_RUNNING_KEY));
            this._emulator_port = s.trim().substr(PUBSUB_EMULATOR_RUNNING_KEY.length);

            this._setEnviromentVariables();
            this._setState(EmulatorStates.RUNNING);
        }

    }

    _getCommandParameters() {
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
            throw new Error('If you set host you need to set port.')
        }

        if (this._options.dataDir) {
            this._createDataDirSync();
            params.push('--data-dir=' + this._options.dataDir);
        }

        if (this._options.debug) {
            params.push('--verbosity=debug');
        }

        return params;
    }

    _writeDebug(message) {
        if (!this._options.debug)
            return;

        console.log(message);
    }

    _setState(newState, params) {
        this._state = newState;
        this._stateEmitter.emit(newState, params);
    }

    _setEnviromentVariables() {
        let env = this._options.host ? this._options.host : 'localhost';

        env += ':' + this._emulator_port;

        process.env.PUBSUB_EMULATOR_HOST = env;

        if (this._options.project)
            process.env.GCLOUD_PROJECT = this._options.project;
    }

    _registerEmulatorListeners() {
        this._emulator.stdout.on('data', this._emulatorStdOutListener.bind(this));

        this._emulator.stderr.on('data', this._emulatorStdErrListener.bind(this));

        this._emulator.on('close', this._emulatorCloseListener.bind(this));

        this._emulator.on('exit', this._emulatorExitListener.bind(this));

        this._emulator.on('error', this._emulatorErrorListener.bind(this));
    }

    _removeEmulatorListeners() {
        this._emulator.stdout.removeListener('data', this._emulatorStdOutListener.bind(this));

        this._emulator.stderr.removeListener('data', this._emulatorStdErrListener.bind(this));

        this._emulator.removeListener('close', this._emulatorCloseListener.bind(this));

        this._emulator.removeListener('exit', this._emulatorExitListener.bind(this));

        this._emulator.removeListener('error', this._emulatorErrorListener.bind(this));

    }

    _emulatorStdOutListener(data) {
        this._writeDebug(`stdout: ${data}`);
        this._processStd(data);
    }

    _emulatorStdErrListener(data) {
        this._writeDebug(`stderr: ${data}`);
        this._processStd(data);
    }

    _emulatorCloseListener(code) {
        this._writeDebug(`child process close with code ${code}`);
        this._setState(EmulatorStates.CLOSE, code);
    }

    _emulatorExitListener(code) {
        this._writeDebug(`child process exit with code ${code}`);
        this._setState(EmulatorStates.EXIT, code);
    }

    _emulatorErrorListener(err) {
        this._writeDebug(`child process error: ${err}`);
        this._setState(EmulatorStates.ERROR, err);
    }

    _clean() {
        if (!this._options.clean)
            return Promise.resolve();

        if (!this._options.dataDir)
            return Promise.resolve();

        return new Promise((resolve, reject) => {
            fse.remove(this._options.dataDir, (err) => {
                /* istanbul ignore next */
                if (err) return reject(err);

                resolve();
            })
        })
    }

    _createDataDirSync() {
        return fse.ensureDir(this._options.dataDir);
    }

    _createTopics() {
        if (!this._options.topics || this._options.topics.length < 1)
            return Promise.resolve();

        return Promise.all(this._options.topics.map(topic => this.isTopicExists(topic)))
            .then((result => {
                    return Promise.all(result
                        .filter(topic => !topic.exists)
                        .map(topic => this._pubsub.topic(topic.topicName).create())
                    )
                })
            );
    }

    isTopicExists(topicName) {
        return this._pubsub.topic(topicName).exists()
            .then((result) => {
                return Promise.resolve({
                    topicName,
                    exists: result[0]
                });
            })
    }
}

module.exports = PubSubEmulator;