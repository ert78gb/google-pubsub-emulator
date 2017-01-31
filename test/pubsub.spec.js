'use strict';
const TEST_TOPIC = 'test-topic';

const Promise = require('bluebird');
const chai = require('chai');
const Emulator = require('../index');
const fs = require('fs');
const fse = require('fs-extra-promise').usePromise(Promise);

chai.use(require("chai-as-promised"));

const expect = chai.expect;
const testData = {
    testProp: 'test-data'
};

describe('Google PubSub Emulator Test', () => {
    const emulatorDir = './emulator-test';

    before((done) => {
        if (directoryExists(emulatorDir))
            fse.remove(emulatorDir)
                .then(done);
        else {
            done()
        }
    });

    beforeEach(() => {
        process.env.GCLOUD_PROJECT = null;
    });

    afterEach(() => {
        process.env.GCLOUD_PROJECT = null;
    });

    it('should start the emulator with default values', () => {
        process.env.GCLOUD_PROJECT = 'test';


        let options = {
            debug: true
        };

        let emulator = new Emulator(options);

        return emulator.start()
            .then(runSimpleTest)
            .then(emulator.stop.bind(emulator));
    });

    it('should not write to console if debug=false', () => {
        process.env.GCLOUD_PROJECT = 'test';
        let wrotePubSub = false;
        console.log = function (d) {
            if (d.indexOf('[pubsub]') > -1) {
                wrotePubSub = true;
            }
            process.stdout.write(d + '\n');
        };

        let options = {
            debug: false
        };

        let emulator = new Emulator(options);

        return emulator.start()
            .then(() => {
                return emulator.stop();
            })
            .then(() => {
                delete console.log;
                expect(wrotePubSub).to.be.equal(false);
                process.env.GCLOUD_PROJECT = null;
            })

    });

    it('should start the emulator when set project Id', () => {
        const projectId = 'test2';

        let options = {
            debug: true,
            project: projectId
        };

        let emulator = new Emulator(options);


        return emulator.start()
            .then(() => {
                const pubsub = require('@google-cloud/pubsub')();
                return pubsub.topic(TEST_TOPIC).create()
            })
            .then((data) => {
                let topic = data[0];

                expect(topic).to.be.ok;
                expect(process.env.GCLOUD_PROJECT).to.be.equal(projectId);

                return Promise.resolve();
            })
            .then(() => {
                const pubsub = require('@google-cloud/pubsub')();
                return pubsub.topic(TEST_TOPIC).exists()
            }).then((data) => {
                let exists = data[0];

                expect(exists).to.be.equal(true);

                return emulator.stop();
            })

    });

    it('should start the emulator when set project Id and dataDir', () => {
        const projectId = 'test3';
        const dataDir = emulatorDir;

        expect(directoryExists(dataDir)).to.be.equal(false);

        let options = {
            debug: true,
            project: projectId,
            dataDir
        };

        let emulator = new Emulator(options);

        return emulator.start()
            .then(() => {
                expect(directoryExists(dataDir)).to.be.equal(true);

                const pubsub = require('@google-cloud/pubsub')();
                return pubsub.topic(TEST_TOPIC).create()
            })
            .then((data) => {
                let topic = data[0];

                expect(topic).to.be.ok;
                expect(process.env.GCLOUD_PROJECT).to.be.equal(projectId);

                return Promise.resolve();
            })
            .then(() => {
                const pubsub = require('@google-cloud/pubsub')();
                return pubsub.topic(TEST_TOPIC).exists()
            }).then((data) => {
                let exists = data[0];

                expect(exists).to.be.equal(true);

                return emulator.stop();
            })
            .then(() => {
                expect(directoryExists(dataDir)).to.be.equal(false);
            })
    });

    it('should start the emulator with specified host and port', () => {
        process.env.GCLOUD_PROJECT = 'test';
        let entityKey;

        let options = {
            debug: true,
            host: 'localhost',
            port: 8555
        };

        let emulator = new Emulator(options);

        return emulator.start()
            .then(runSimpleTest)
            .then(() => {

                expect(process.env.PUBSUB_EMULATOR_HOST).to.be.equal('localhost:8555');
                return emulator.stop()
            })
    });

    it('should throw error when call only with host options', () => {
        process.env.GCLOUD_PROJECT = 'test';

        let options = {
            debug: true,
            host: 'localhost'
        };

        let emulator = new Emulator(options);

        return expect(emulator.start()).to.eventually.be.rejectedWith('If you set host you need to set port');
    });

    it('should start the emulator on localhost when specified only port', () => {
        process.env.GCLOUD_PROJECT = 'test';
        let entityKey;

        let options = {
            debug: true,
            port: 8555
        };

        let emulator = new Emulator(options);

        return emulator.start()
            .then(runSimpleTest)
            .then(emulator.stop.bind(emulator));
    });

    it('should not start twice', () => {
        process.env.GCLOUD_PROJECT = 'test';

        let options = {
            debug: true
        };

        let emulator = new Emulator(options);

        return emulator.start()
            .then(() => {
                return expect(emulator.start()).to.rejected;
            })
            .then((error) => {
                return emulator.stop().then(() => {
                    expect(error).to.have.property('message', 'PubSub emulator is already running.');
                });
            })
    })

    it('should return ok when call stop twice', () => {
        process.env.GCLOUD_PROJECT = 'test';

        let options = {
            debug: true
        };

        let emulator = new Emulator(options);

        return emulator.stop()
            .then(emulator.stop.bind(emulator))
            .then(emulator.stop.bind(emulator));
    });

    it('should left the dataDir when clean = false', ()=>{
        const dataDir = emulatorDir;

        expect(directoryExists(dataDir)).to.be.equal(false);

        let options = {
            debug: true,
            dataDir,
            clean: false
        };

        let emulator = new Emulator(options);

        return emulator.start()
            .then(() => {
                expect(directoryExists(dataDir)).to.be.equal(true);

                return runSimpleTest();
            })
            .then(() => {
                return emulator.stop()
            })
            .then(() => {
                expect(directoryExists(dataDir)).to.be.equal(true);

                return new Promise((resolve, reject) => {
                    fse.remove(dataDir, (err) => {
                        if (err) return reject(err);

                        resolve();
                    })
                })
            })
    });

    it('should create topics if not exists when got topics option', () => {
        let options = {
            debug: true,
            topics: [
                'projects/test/topics/topic-1',
                'projects/test/topics/topic-2'
            ]
        };

        let emulator = new Emulator(options);

        return emulator.start()
            .then(() => {

                return Promise.all([
                    emulator.isTopicExists(options.topics[0]),
                    emulator.isTopicExists(options.topics[1])
                ])

            })
            .then((result) => {
                expect(result[0].exists).to.be.equal(true);
                expect(result[1].exists).to.be.equal(true);

                return emulator.stop()
            })

    })
});

function directoryExists(dir) {
    try {
        const stat = fs.statSync(dir);

        return stat.isDirectory();
    }
    catch (error) {
        return false;
    }
}

function runSimpleTest() {
    const pubsub = require('@google-cloud/pubsub')();

    return pubsub.topic(TEST_TOPIC).create()
        .then((data) => {
            let topic = data[0];

            expect(topic).to.be.ok;

            return Promise.resolve();
        })
        .then(() => {
            return pubsub.topic(TEST_TOPIC).exists()
        })
        .then((data) => {
            let exists = data[0];

            expect(exists).to.be.equal(true);

            return Promise.resolve();
        })
}
