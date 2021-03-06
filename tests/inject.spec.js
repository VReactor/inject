import {ERROR, Inject} from '../src/inject';

describe('Inject Inversion of Control', function() {
    const empty = function() {};
    let $Inject;

    beforeEach(function() {
        $Inject = new Inject();

        $Inject.register({
			token: 'logging',
			value: function() {
				return {
					log: function(message) {
						return message;
					}
				};
			}
		});
    });

    it('Given ioc when Inject requested then returns self.', function() {
        const actual = $Inject.get('$Inject');
        expect(actual).toBe($Inject);
    });

    describe('First-time registration', function() {
        it('Given self-invoking constructor function when registered then registers successfully', function() {
            const expected = '1';

            const fn = (function() {
                function Fn(log) {
                    this.log = log;
                    this.test = function() {
                        return log.log(expected);
                    };
                }
                return Fn;
            })();

            $Inject.register({token: '1', value: fn, deps: ['logging']});
            const actual = $Inject.get('1');
            expect(actual.test()).toBe(expected);
        });

        it('Given function constructor when registered then registers successfully', function() {
            const expected = '2';

            function Fn(log) {
                this.test = log.log(expected);
            }

            $Inject.register({token: '2', value: Fn, deps: ['logging']});
            const actual = $Inject.get('2');
            expect(actual.test).toBe(expected);
        });

        it('Given function factory method when registered then registers successfully', function() {
            const expected = '3';

            const factory = function(log) {
                return {
                    test: log.log(expected)
                };
            };

            factory.$deps = ['logging'];

            $Inject.register({token: '3', value: factory});
            const actual = $Inject.get('3');
            expect(actual.test).toBe(expected);
        });
    });

    describe('Validity checks and contracts', function() {
        it('Given something other than an array passed then it throws an error', function() {
			const regex = new RegExp(ERROR.ARRAY);

            expect(function() {
                $Inject.register({token: '4', value: function() {}, deps: '4'});
            }).toThrowError(regex);
        });

        it('Given lst item in array passed is not a function then it throws an error', function() {
			const regex = new RegExp(ERROR.FUNCTION);

            expect(function() {
                $Inject.register({token: '4', value: ['4']});
            }).toThrowError(regex);
        });

        it('Given a registration already exists when duplicate registration is attempted then it throws an error', function() {
			const regex = new RegExp(ERROR.REGISTRATION);

            $Inject.register({token: '3', value: empty});

            expect(function() {
                $Inject.register({token: '3', value: empty});
            }).toThrowError(regex);
        });

        it('Given recursive dependencies when a dependency is requested then it throws an error', function() {
            const regex = new RegExp(ERROR.RECURSION);

            $Inject.register([
				{token: 'depA', value: empty, deps: ['depB']},
				{token: 'depB', value: empty, deps: ['depA']},
			]);

            expect(function() {
                const depA = $Inject.get('depA');
            }).toThrowError(regex);
        });

        it('Given get request on service that does not exist then it throws an error', function() {
			const regex = new RegExp(ERROR.SERVICE);

           expect(function() {
               const nothing = $Inject.get('nothing');
           }).toThrowError(regex);
        });
    });

    describe('Run-time annotations', function() {
        function serviceA() {
            return {
                id: 'a'
            };
        }

        function serviceB(a) {
            return {
                id: a.id + 'b'
            };
        }

        function serviceC(a, b) {
            return {
                id: a.id + b.id + 'c'
            };
        }

        beforeEach(function() {
            $Inject.register([
				{token: 'serviceA', value: serviceA},
				{token: 'serviceB', value: serviceB, deps: ['serviceA']},
				{token: 'serviceC', value: serviceC, deps: ['serviceA']},
			]);
        });

        it('Given registration with proper annotation then returns properly configured instance', function() {
            const expected = 'ab';
            const actual = $Inject.get('serviceB').id;
            expect(actual).toBe(expected);
        });

        it('Given registration with improper annotation then throws exception due to bad reference', function() {
            expect(function() {
                $Inject.get('serviceC');
            }).toThrow();
        });
    });

    describe('Object annotations', function() {
        function ServiceA() {
            this.id = 'a';
        }

        function ServiceB(serviceA) {
            this.id = serviceA.id + 'b';
        }

        ServiceB.$deps = ['ServiceA'];

        function ServiceC(serviceA, serviceB) {
            this.id = serviceA.id + serviceB.id + 'b';
        }

        ServiceC.$deps = ['ServiceA'];

        beforeEach(function() {
            $Inject.register([
				{token: 'ServiceA', value: ServiceA},
				{token: 'ServiceB', value: ServiceB},
				{token: 'ServiceC', value: ServiceC},
			]);
        });

        it('Given registration with properly annotated function then returns properly configured instance', function() {
            const expected = 'ab';
            const actual = $Inject.get('ServiceB').id;
            expect(actual).toBe(expected);
        });

        it('Given registration with improperly annotated function then throws exception due to bad reference', function() {
            expect(function() {
                $Inject.get('ServiceC');
            }).toThrow();
        });
    });
});
