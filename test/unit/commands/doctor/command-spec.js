'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

const modulePath = '../../../../lib/commands/doctor/index';

describe('Unit: Commands > Doctor', function () {
    it('doesn\'t do anything if there are no checks to run (with log)', function () {
        const listrStub = sinon.stub().resolves();
        const logStub = sinon.stub();
        const DoctorCommand = proxyquire(modulePath, {
            './checks': []
        });
        const instance = new DoctorCommand({listr: listrStub, log: logStub}, {});

        return instance.run({}).then(() => {
            expect(listrStub.called).to.be.false;
            expect(logStub.calledOnce).to.be.true;
            expect(logStub.args[0][0]).to.match(/No checks found to run/);
        });
    });

    it('doesn\'t do anything if there are no checks to run (without log)', function () {
        const listrStub = sinon.stub().resolves();
        const logStub = sinon.stub();
        const DoctorCommand = proxyquire(modulePath, {
            './checks': []
        });
        const instance = new DoctorCommand({listr: listrStub, log: logStub}, {});

        return instance.run({quiet: true}).then(() => {
            expect(listrStub.called).to.be.false;
            expect(logStub.called).to.be.false;
        });
    });

    it('checks instance if skipInstanceCheck not passed, uses correct context', function () {
        const ui = {listr: sinon.stub().resolves()};
        const instanceStub = {checkEnvironment: sinon.stub()};
        const system = {getInstance: sinon.stub().returns(instanceStub)};
        const checkValidStub = sinon.stub();

        const DoctorCommand = proxyquire(modulePath, {
            '../../utils/check-valid-install': checkValidStub,
            './checks': [{}]
        });
        const instance = new DoctorCommand(ui, system);

        return instance.run({test: true, a: 'b'}).then(() => {
            expect(checkValidStub.calledOnce).to.be.true;
            expect(system.getInstance.calledOnce).to.be.true;
            expect(instanceStub.checkEnvironment.calledOnce).to.be.true;
            expect(ui.listr.calledOnce).to.be.true;
            expect(ui.listr.args[0][0]).to.deep.equal([{}]);
            const context = ui.listr.args[0][1];
            expect(context.argv).to.deep.equal({test: true, a: 'b'});
            expect(context.system).to.equal(system);
            expect(context.instance).to.equal(instanceStub);
            expect(context.ui).to.equal(ui);
            expect(context.local).to.be.false;
            expect(context.isDoctorCommand).to.be.false;
        });
    });

    it('skips instance check if skipInstanceCheck is true, uses correct context', function () {
        const ui = {listr: sinon.stub().resolves()};
        const instanceStub = {checkEnvironment: sinon.stub()};
        const system = {getInstance: sinon.stub().returns(instanceStub)};
        const checkValidStub = sinon.stub();

        const DoctorCommand = proxyquire(modulePath, {
            '../../utils/check-valid-install': checkValidStub,
            './checks': [{}]
        });
        const instance = new DoctorCommand(ui, system);

        return instance.run({skipInstanceCheck: true, local: true, argv: true}).then(() => {
            expect(checkValidStub.called).to.be.false;
            expect(system.getInstance.called).to.be.false;
            expect(instanceStub.checkEnvironment.called).to.be.false;
            expect(ui.listr.calledOnce).to.be.true;
            expect(ui.listr.args[0][0]).to.deep.equal([{}]);
            const context = ui.listr.args[0][1];
            expect(context.argv).to.deep.equal({skipInstanceCheck: true, local: true, argv: true});
            expect(context.system).to.equal(system);
            expect(context.instance).to.not.exist;
            expect(context.ui).to.equal(ui);
            expect(context.local).to.be.true;
            expect(context.isDoctorCommand).to.be.false;
        });
    });

    it('skips instance check if only category is install, uses correct context', function () {
        const ui = {listr: sinon.stub().resolves()};
        const instanceStub = {checkEnvironment: sinon.stub()};
        const system = {getInstance: sinon.stub().returns(instanceStub)};
        const checkValidStub = sinon.stub();

        const DoctorCommand = proxyquire(modulePath, {
            '../../utils/check-valid-install': checkValidStub,
            './checks': [{category: ['install']}]
        });
        const instance = new DoctorCommand(ui, system);

        return instance.run({
            skipInstanceCheck: true,
            local: true,
            argv: true,
            categories: ['install'],
            _: ['doctor']
        }).then(() => {
            expect(checkValidStub.called).to.be.false;
            expect(system.getInstance.called).to.be.false;
            expect(instanceStub.checkEnvironment.called).to.be.false;
            expect(ui.listr.calledOnce).to.be.true;
            expect(ui.listr.args[0][0]).to.deep.equal([{category: ['install']}]);
            const context = ui.listr.args[0][1];
            expect(context.argv).to.deep.equal({
                skipInstanceCheck: true,
                local: true,
                argv: true,
                categories: ['install'],
                _: ['doctor']
            });
            expect(context.system).to.equal(system);
            expect(context.instance).to.not.exist;
            expect(context.ui).to.equal(ui);
            expect(context.local).to.be.true;
            expect(context.isDoctorCommand).to.be.true;
        });
    });

    describe('filters checks correctly', function () {
        const testChecks = [{
            title: 'Check 1',
            category: ['install']
        }, {
            title: 'Check 2',
            category: ['start']
        }, {
            title: 'Check 3',
            category: ['install', 'start']
        }];

        let DoctorCommand;

        before(() => {
            DoctorCommand = proxyquire(modulePath, {
                './checks': testChecks
            });
        })

        it('doesn\'t filter if no categories passed', function () {
            const listrStub = sinon.stub().resolves();
            const instance = new DoctorCommand({listr: listrStub}, {system: true});

            return instance.run({skipInstanceCheck: true}).then(() => {
                expect(listrStub.calledOnce).to.be.true;
                const tasks = listrStub.args[0][0];
                expect(tasks).to.be.an('array');
                expect(tasks.length).to.equal(3);
            });
        });

        it('filters with one category passed', function () {
            const listrStub = sinon.stub().resolves();
            const instance = new DoctorCommand({listr: listrStub}, {system: true});

            return instance.run({skipInstanceCheck: true, categories: ['install']}).then(() => {
                expect(listrStub.calledOnce).to.be.true;
                const tasks = listrStub.args[0][0];
                expect(tasks).to.be.an('array');
                expect(tasks.length).to.equal(2);
                expect(tasks[0].title).to.equal('Check 1');
                expect(tasks[1].title).to.equal('Check 3');
            });
        });

        it('filters with another category passed', function () {
            const listrStub = sinon.stub().resolves();
            const instance = new DoctorCommand({listr: listrStub}, {system: true});

            return instance.run({skipInstanceCheck: true, categories: ['start']}).then(() => {
                expect(listrStub.calledOnce).to.be.true;
                const tasks = listrStub.args[0][0];
                expect(tasks).to.be.an('array');
                expect(tasks.length).to.equal(2);
                expect(tasks[0].title).to.equal('Check 2');
                expect(tasks[1].title).to.equal('Check 3');
            });
        });

        it('filters with multiple categories passed', function () {
            const listrStub = sinon.stub().resolves();
            const instance = new DoctorCommand({listr: listrStub}, {system: true});

            return instance.run({skipInstanceCheck: true, categories: ['install', 'start']}).then(() => {
                expect(listrStub.calledOnce).to.be.true;
                const tasks = listrStub.args[0][0];
                expect(tasks).to.be.an('array');
                expect(tasks.length).to.equal(3);
            });
        });
    });
});
