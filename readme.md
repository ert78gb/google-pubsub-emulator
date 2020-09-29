![CI](https://github.com/ert78gb/google-pubsub-emulator/workflows/CI/badge.svg)
![CodeQL](https://github.com/ert78gb/google-pubsub-emulator/workflows/CodeQL/badge.svg)

Google Cloud PubSub Emulator
===============================

This package helps to start / stop [Google Cloud Pub/Sub Emulator](https://cloud.google.com/sdk/gcloud/reference/beta/emulators/pubsub/) with javascript.
Perfect to support unit testing when you need the local emulator start in unit / half integration test.

The wrapper sets PUBSUB_EMULATOR_HOST and GCLOUD_PROJECT environment variables.

From 2.0.0 @google-cloud/pubsub moved to the peer dependencies.

#Prerequisites
To use the emulator you need to install [Google Cloud SDK](https://cloud.google.com/sdk/downloads)

#Installation
```
npm install google-pubsub-emulator --save-dev
```

#Usage
I think the package is the most suitable for unit testing.
 
```javascript
const {PubSub} = require('@google-cloud/pubsub');
const Emulator = require('google-pubsub-emulator');

describe('test suit', ()=>{
    process.env.GCLOUD_PROJECT = 'project-id'; // Set the gcloud project Id globally

    let emulator;
    
    before(()=>{
        const options = {
            debug:true, // if you like to see the emulator output
            topics: [
                'projects/project-id/topics/topic-1' // automatically created topic
            ]
        };
        
        emulator = new Emulator(options);
        
        return emulator.start();
    });
    
    after(()=>{
        return emulator.stop();
    });
    
    it('test case', ()=>{
        // your test
    });
})

```

## Options

parameter (type) | default value | description
----------|---------------|-------------------
project (string) | empty | This variable is gcloud project Id. If it is empty, GCLOUD_PROJECT environment variable will be used. Either you should set it directly or the environment variable should be set.
dataDir (string) | empty | The emulator creates a directory where the project files are stored. If it is empty the emulator default value will be used. You could set relative ./directory or absolute path /tmp/dir1/dir2/. If this directory does not exist, it will be created.
clean (boolean) | true | If dataDir value is set and 'clean' value is true then the package deletes the dataDir. The package **does not** delete the gcloud emulator default directory. 
host (string) | empty | If it is empty the'localhost' of google default value is used. It can take the form of a single address (hostname, IPv4, or IPv6)
port (number) | empty | If it is empty the emulator selects a random free port.
debug (boolean) | false | If it is true, it writes the console.logs of the emulator onto the main process console.
topics (array) | [] | If it is contains values then the wrapper create the missing topics. You should set the full identifier of the topic 'projects/<project-name>/topics/<topic-name>'

## Methods

name | description
-----|------------
start | Starts the emulator and returns a Promise.
stop | Stops the emulator and returns a Promise.

#License

MIT
