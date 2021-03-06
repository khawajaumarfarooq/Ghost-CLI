'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');

const errors = require('../../../../../lib/errors');
const setupEnv = require('../../../../utils/env');
const advancedOpts = require('../../../../../lib/commands/config/advanced');

const validateConfig = require('../../../../../lib/commands/doctor/checks/validate-config');

describe('Unit: Doctor Checks > validateConfig', function () {
    const sandbox = sinon.sandbox.create();
    let env;

    afterEach(function () {
        sandbox.restore();

        if (env) {
            env.cleanup();
            env = null;
        }
    });

    it('rejects if environment is passed and no config exists for that environment', function () {
        env = setupEnv();
        const cwdStub = sandbox.stub(process, 'cwd').returns(env.dir);

        return validateConfig.task({system: {environment: 'testing'}}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.message).to.match(/Config file is not valid JSON/);
            expect(error.options.environment).to.equal('testing');
            expect(cwdStub.calledOnce).to.be.true;
        });
    });

    it('rejects if environment is passed and the config file is not valid json', function () {
        env = setupEnv({files: [{path: 'config.testing.json', contents: 'not json'}]});
        const cwdStub = sandbox.stub(process, 'cwd').returns(env.dir);

        return validateConfig.task({system: {environment: 'testing'}}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.message).to.match(/Config file is not valid JSON/);
            expect(error.options.environment).to.equal('testing');
            expect(cwdStub.calledOnce).to.be.true;
        });
    });

    it('rejects with error if config values does not pass', function () {
        const config = {server: {port: 2368}};
        env = setupEnv({files: [{path: 'config.testing.json', content: config, json: true}]});
        const urlStub = sandbox.stub(advancedOpts.url, 'validate').returns('Invalid URL');
        const portStub = sandbox.stub(advancedOpts.port, 'validate').returns('Port is in use');
        sandbox.stub(process, 'cwd').returns(env.dir);

        return validateConfig.task({system: {environment: 'testing'}}).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.ConfigError);
            expect(error.message).to.equal('Port is in use');
            expect(error.options.config).to.deep.equal({'server.port': 2368});
            expect(urlStub.called).to.be.false;
            expect(portStub.calledOnce).to.be.true;
            expect(portStub.calledWithExactly(2368)).to.be.true;
        });
    });

    it('passes if all validate functions return true', function () {
        const config = {server: {port: 2368}};
        const env = setupEnv({files: [{path: 'config.testing.json', content: config, json: true}]});
        const urlStub = sandbox.stub(advancedOpts.url, 'validate').returns(true);
        const portStub = sandbox.stub(advancedOpts.port, 'validate').returns(true);
        sandbox.stub(process, 'cwd').returns(env.dir);

        return validateConfig.task({system: {environment: 'testing'}}).then(() => {
            expect(urlStub.called).to.be.false;
            expect(portStub.calledOnce).to.be.true;
            expect(portStub.calledWithExactly(2368)).to.be.true;
        });
    });
});
