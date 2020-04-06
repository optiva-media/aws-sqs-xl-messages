# AWS SQS XL Messages

The AWS SQS XL Messages Library enables you to manage Amazon SQS message payloads with Amazon S3. This is especially useful for storing and retrieving messages with a message payload size greater than the current SQS limit of 256 KB, up to a maximum of 2 GB. Specifically, you can use this library to:

* Specify whether message payloads are always stored in Amazon S3 or only when a message's size exceeds 256 KB.

* Send a message that references a single message object stored in an Amazon S3 bucket.

* Get the corresponding message object from an Amazon S3 bucket.

* Delete the corresponding message object from an Amazon S3 bucket.

## Software requirements

* Use Unix-based operating system.
* NodeJS (>=10.15.3)

## Installation

If you want to use an stable version

```sh
npm install git@bitbucket.org:optivamedia/aws-sqs-xl-messages.git#develop --save
```

Or if you want to use a local version

```sh
npm install file:/path/to/local/copy/of/aws-sqs-xl-messages --save
```

Then you can use it in the code like this:

```js
const {SQS, S3} = require('aws-sdk'),
    {SQSExt, Config} = require('aws-sqs-xl-messages')(SQS),
    config = new Config();
 
config.enableLargePayloadSupport(new S3(), 'my-bucket');
 
let sqs = new SQSExt({extendedConfig: config}); // you can now use sqs as if it was an sqs client from aws-sdk
```

## Development

### Getting started

1. Install **NodeJS** if you haven't installed it yet (currently we are using node v10.15.3):

    * Windows. Follow the instructions [here](https://nodejs.org/en/).
    * Linux/Mac

      ```sh
      sudo npm install -g n
      sudo n stable
      ```

2. Install **grunt-cli** if you haven't installed it yet:

    ```sh
    sudo npm install -g grunt-cli
    ```

3. Install **eslint** if you haven't installed it yet:

    ```sh
    sudo npm install -g eslint
    ```

4. Finally, install dependencies and prepare your dev environment:

    ```sh
    npm install
    ```


## Unit Testing

To run all the specs locally you must execute `npm test`.

If you want to run just _some_ tests...

* Run tests of a given spec file: `npm test spec/thisIsATestExample.spec.js`

* Run an specific test. You must rename jasmine methods as follows

```js
const extendSQSMixin = require('../src/extendSQSMixin'),
    SQSMock = class SQS {};

// Rename describe to fdescribe in order to test only this block.
// You can also rename it to xdescribe in order to tell jasmine it must skip this block.
describe('extendSQSMixin', () => {

    // Rename it to fit in order to test only this spec.
    // You can also rename it to xit in order to tell jasmine it must skip this spec.
    it('should return an SQS client class', () => {
        expect(extendSQSMixin(SQSMock)).toBeInstanceOf(SQSMock);
    });
});

```

## Test coverage

This project uses NYC to measure coverage. You can start a new coverage analysis typing `npm run coverage`.

A complete report will be generated at `reports/coverage/lcov-report/index.html`.

## JSDoc

This project uses JSDoc to automagically generate beatiful code documentation. You can locally generate the documentation by typing `npm run jsdoc`.

An HTML version of the documentation will be generated at `docs/aws-sqs-xl-messages/X.Y.Z/index.html`.

## Code analysis

This project uses Plato to statically analyze the code. You can start a new code analysis typing `npm run plato`.

Reports are stored in `reports/plato/` and they can be easily checked at `reports/plato/index.html`. Note Plato keeps a report history unless you manually remove the reports folder.

## Dependencies

* [lodash](https://lodash.com/)
* [uuid](https://github.com/uuidjs/uuid)

## Development dependencies

* [docdash](https://github.com/clenemt/docdash)
* [eslint-config-google](https://github.com/google/eslint-config-google/blob/master/README.md)
* [grunt](https://gruntjs.com/getting-started)
* [grunt-cli](https://gruntjs.com/using-the-cli)
* [grunt-contrib-symlink](https://github.com/gruntjs/grunt-contrib-symlink)
* [grunt-contrib-uglify](https://github.com/gruntjs/grunt-contrib-uglify)
* [grunt-contrib-watch](https://github.com/gruntjs/grunt-contrib-watch)
* [grunt-env](https://github.com/jsoverson/grunt-env)
* [grunt-eslint](https://github.com/sindresorhus/grunt-eslint)
* [grunt-gitinfo](https://github.com/damkraw/grunt-gitinfo)
* [jasmine](https://jasmine.github.io/)
* [jasmine-console-reporter](https://github.com/onury/jasmine-console-reporter#readme)
* [jsdoc](https://jsdoc.app/)
* [load-grunt-config](https://github.com/firstandthird/load-grunt-config#readme)
* [load-grunt-tasks](https://github.com/sindresorhus/load-grunt-tasks#readme)
* [mockery](https://github.com/mfncooper/mockery#readme)
* [nyc](https://github.com/istanbuljs/nyc)
* [plato](https://github.com/es-analysis/plato)
* [prettier-eslint](https://github.com/prettier/prettier-eslint)
* [symlink](https://github.com/clux/symlink#readme)
* [time-grunt](https://github.com/sindresorhus/time-grunt#readme)
* [userhome](https://www.npmjs.com/package/userhome)