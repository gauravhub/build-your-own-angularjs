/* global describe it expect Scope jasmine beforeEach*/

/* jshint globalstrict: true */
'use strict';

describe("Scope", function () {
    it("can be instantiated and used as an object", function () {
        var scope = new Scope();
        scope.property1 = "value1";
        
        expect(scope.property1).toBe("value1");
    })
    
    describe("digest", function () {
        var scope;
        
        beforeEach(function () {
            scope = new Scope();
        })
        
        it("calls the listener function of a watch on first digest", function () {
            var watchFn = function () { return "watch"; }
            
            var listenerFn = jasmine.createSpy();
            
            scope.$watch(watchFn, listenerFn);
            
            scope.$digest();
            
            expect(listenerFn).toHaveBeenCalled();
        })
        
        it("calls the watch function with scope as an argument", function () {
            var watchFn = jasmine.createSpy();

            var listenerFn = function() {};
            
            scope.$watch(watchFn, listenerFn);
            
            scope.$digest();
            
            expect(watchFn).toHaveBeenCalledWith(scope);
        })
        
        it("calls the listener function when the watched value changes", function() {
            scope.aProperty = "value1";
            var counter = 0;
            
            scope.$watch(function(scope) {
                return scope.aProperty;
            }, function (oldValue, newValue, scope) {
                counter++;
            })
            
            expect(counter).toBe(0);
            
            scope.$digest();
            expect(counter).toBe(1);
            
            scope.$digest();
            expect(counter).toBe(1);

            scope.aProperty = "value2";
            expect(counter).toBe(1);
            
            scope.$digest();
            expect(counter).toBe(2);
        })
        
        it("calls listener when watch value is first undefined", function() {
            scope.counter = 0;
            scope.$watch(
                function(scope) { return scope.someValue; },
                function(newValue, oldValue, scope) { scope.counter++; }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        })

        it("calls listener with new value as old value the first time", function() {
            scope.someValue = 123;
            var oldValueGiven;
            scope.$watch(
                function(scope) { return scope.someValue; },
                function(newValue, oldValue, scope) { oldValueGiven = oldValue; }
            );

            scope.$digest();
            expect(oldValueGiven).toBe(123);
        })

        it("may have watches that omit the listener function", function() {
            var watchFn = jasmine.createSpy();
            scope.$watch(watchFn);
            scope.$digest();
            expect(watchFn).toHaveBeenCalled();
        })

        it("triggers chained watches in the same digest", function() {
            scope.name = "jane";

            scope.$watch(
                function(scope){
                    return scope.upperName;
                },

                function(newValue, oldValue, scope){
                    if(newValue) {
                        scope.initials = newValue.substring(0,1);
                    }
                }
            );

            scope.$watch(
                function(scope) {
                    return scope.name;
                },

                function(newValue, oldValue, scope) {
                    if(newValue) {
                        scope.upperName = newValue.toUpperCase();
                    }
                }
            );

            scope.$digest();

            expect(scope.initials).toBe("J");
        
            scope.name = "bob";
            scope.$digest();

            expect(scope.initials).toBe("B");
        })

        it("gives up on the watches after 10 iterations", function() {
            scope.counterA = 0;
            scope.counterB = 0;
            scope.$watch(
                function(scope) { return scope.counterA; },
                function(newValue, oldValue, scope) {
                    scope.counterB++;
                }
            );
            
            scope.$watch(
                function(scope) { return scope.counterB; },
                function(newValue, oldValue, scope) {
                    scope.counterA++;
                }
            );

            expect((function() { scope.$digest(); })).toThrow();
        })

        it("runs the digest loop only till the last dirty watch in previous iteration", function(){
            scope.array = _.range(100);

            var watchExecutions = 0;

            _.times(100, function(i) {
                scope.$watch(
                    function(scope) {
                        watchExecutions++;
                        return scope.array[i];
                    }, 
                    function(newValue, oldValue, scope) {
                    }
                );
            });

            scope.$digest();
            expect(watchExecutions).toBe(200);

            scope.array[0] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(301);
        })

        it("does not end digest so that new watches are not run", function() {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(
                function(scope) { 
                    return scope.aValue; 
                },
                function(newValue, oldValue, scope) {
                    scope.$watch(
                        function(scope) { 
                            return scope.aValue; 
                        },
                        function(newValue, oldValue, scope) {
                            scope.counter++;
                        }
                    );
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        })

        it("compares based on value if enabled", function() {
            scope.aValue = [1, 2, 3];
            scope.counter = 0;
            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                },
                true
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.aValue.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);
        })

        it("correctly handles NaNs", function() {
            scope.number = 0/0; // NaN
            scope.counter = 0;
            scope.$watch(
                function(scope) { return scope.number; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
        })

        it("executes function with scope as the first parameter", function() {
            scope.aValue = 42;
            var result = scope.$eval(function(scope) {
                return scope.aValue;
            });

            expect(result).toBe(42);
        })

        it("executes funtion with arguments as second parameter", function() {
            scope.aValue = 42;
            var result = scope.$eval(function(scope, arg) {
                return scope.aValue + arg;
            }, 2);

            expect(result).toBe(44);
        })

        it("executes function using eval and then starts the digest", function() {
            scope.aValue = 'someValue';
            scope.counter = 0;
            scope.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            
            scope.$apply(function(scope) {
                scope.aValue = 'someOtherValue';
            });
            expect(scope.counter).toBe(2);
        })

        it("executes $evalAsynced function later in the same cycle", function() {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediately = false;
            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.$evalAsync(function(scope) { scope.asyncEvaluated = true; });
                    scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
                }
            );
            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);
        })

        it("executes $evalAsynced functions added by watch functions", function() {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.$watch(
                function(scope) {
                    if (!scope.asyncEvaluated) {
                        scope.$evalAsync(
                            function(scope) {
                                scope.asyncEvaluated = true;
                        });
                    }
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) { }
            );

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
        })

        it("executes $evalAsynced functions even when not dirty", function() {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluatedTimes = 0;
            scope.$watch(
                    function(scope) {
                        if (scope.asyncEvaluatedTimes < 2) {
                            scope.$evalAsync(
                                function(scope) {
                                    scope.asyncEvaluatedTimes++;
                                });
                        }       
                        return scope.aValue;
                    },
                    function(newValue, oldValue, scope) { }
            );
            scope.$digest();
            expect(scope.asyncEvaluatedTimes).toBe(2);
        })

        it("eventually halts $evalAsyncs added by watches", function() {
            scope.aValue = [1, 2, 3];
            scope.$watch(
                function(scope) {
                    scope.$evalAsync(function(scope) { });
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) { }
            );
            expect(function() { scope.$digest(); }).toThrow();
        })

        it("has a $$phase field whose value is the current digest phase", function() {
            scope.aValue = [1, 2, 3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;
            scope.$watch(
                function(scope) {
                    scope.phaseInWatchFunction = scope.$$phase;
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.phaseInListenerFunction = scope.$$phase;
                }
            );
            
            scope.$apply(
                function(scope) {
                    scope.phaseInApplyFunction = scope.$$phase;
                }
            );

            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');
        })

        it("schedules a digest in $evalAsync", function(done) {
            scope.aValue = "abc";
            scope.counter = 0;
            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$evalAsync(function(scope) {});
            expect(scope.counter).toBe(0);
            setTimeout(
                function() {
                    expect(scope.counter).toBe(1);
                    done();
                }, 
            50);
        })

        it('allows async $apply with $applyAsync', function(done) {
            scope.counter = 0;
            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$applyAsync(function(scope) {
                scope.aValue = 'abc';
            });
            expect(scope.counter).toBe(1);
            setTimeout(function() {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        })

        it("never executes $applyAsync'ed function in the same cycle", function(done) {
            scope.aValue = [1, 2, 3];
            scope.asyncApplied = false;
            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.$applyAsync(
                        function(scope) {
                            scope.asyncApplied = true;
                        }
                    );
                }
            );
            scope.$digest();
            expect(scope.asyncApplied).toBe(false);
            setTimeout(
                function() {
                    expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        })

        it('coalesces many calls to $applyAsync', function(done) {
            scope.counter = 0;
            scope.$watch(
                function(scope) {
                    scope.counter++;
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) { }
            );
        
            scope.$applyAsync(function(scope) {
                scope.aValue = 'abc';
            });
            
            scope.$applyAsync(function(scope) {
                scope.aValue = 'def';
            });

            setTimeout(function() {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        })

        it('cancels and flushes $applyAsync if digested first', function(done) {
            scope.counter = 0;
            scope.$watch(
                function(scope) {
                    scope.counter++;
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) { }
            );
    
            scope.$applyAsync(
                function(scope) {
                    scope.aValue = 'abc';
                }
            );

            scope.$applyAsync(
                function(scope) {
                    scope.aValue = 'def';
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(scope.aValue).toEqual('def');
            
            setTimeout(function() {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        })

        it("runs a $$postDigest function after each digest", function() {
            scope.counter = 0;
            scope.$$postDigest(
                function() {
                    scope.counter++;
                }
            );

            expect(scope.counter).toBe(0);
            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.$digest();
            expect(scope.counter).toBe(1);
        })

        it("does not include $$postDigest in the digest", function() {
            scope.aValue = 'original value';
            scope.$$postDigest(
                function() {
                    scope.aValue = 'changed value';
            });
        
            scope.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.watchedValue = newValue;
                }
            );
        
            scope.$digest();
            expect(scope.watchedValue).toBe('original value');
            scope.$digest();
            expect(scope.watchedValue).toBe('changed value');
        })

        it("catches exceptions in watch functions and continues", function() {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(
                function(scope) { throw "error"; },
                function(newValue, oldValue, scope) { }
            );

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        })  

        it("catches exceptions in listener functions and continues", function() {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    throw "Error";
                }
            );

            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        })

        it("catches exceptions in $evalAsync", function(done) {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$evalAsync(function(scope) {
                throw "Error";
            });

            setTimeout(
                function() {
                    expect(scope.counter).toBe(1);
                    done();
                }, 50);
        })

        it("catches exceptions in $applyAsync", function(done) {
            scope.$applyAsync(function(scope) {
                throw "Error";
            });

            scope.$applyAsync(function(scope) {
                throw "Error";
            });

            scope.$applyAsync(function(scope) {
                scope.applied = true;
            });

            setTimeout(
                function() {
                    expect(scope.applied).toBe(true);
                    done();
                }, 50);
        })

        it("catches exceptions in $$postDigest", function() {
            var didRun = false;
            scope.$$postDigest(function() {
                throw "Error";
            });
            scope.$$postDigest(function() {
                didRun = true;
            });
            scope.$digest();
            expect(didRun).toBe(true);
        })

        it("allows destroying a $watch with a removal function", function() {
            scope.aValue = 'abc';
            scope.counter = 0;
            var destroyWatch = scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            scope.aValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);
            scope.aValue = 'ghi';
            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        })

        it("allows destroying a $watch during digest", function() {
            scope.aValue = 'abc';
            var watchCalls = [];
            scope.$watch(
                function(scope) {
                    watchCalls.push('first');
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                }
            );
    
            var destroyWatch = scope.$watch(
                function(scope) {
                    watchCalls.push('second');
                    destroyWatch();
                },
                function(newValue, oldValue, scope) {
                }
            );

            scope.$watch(
                function(scope) {
                    watchCalls.push('third');
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                }
            );
            scope.$digest();
            expect(watchCalls).toEqual(['first', 'second', 'third', 'first', 'third']);
        })

        it("allows a $watch to destroy another during digest", function() {
            scope.aValue = 'abc';
            scope.counter = 0;
            scope.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    destroyWatch();
                }
            );
            var destroyWatch = scope.$watch(
                function(scope) { },
                function(newValue, oldValue, scope) { }
            );
            scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(1);
        })

        it("allows destroying several $watches during digest", function() {
            scope.aValue = 'abc';
            scope.counter = 0;
            var destroyWatch1 = scope.$watch(
                function(scope) {
                    destroyWatch1();
                    destroyWatch2();
                }
            );
            var destroyWatch2 = scope.$watch(
                function(scope) { return scope.aValue; },
                function(newValue, oldValue, scope) {
                    scope.counter++;
                }
            );
            scope.$digest();
            expect(scope.counter).toBe(0);
        })
    })

    describe('watchGroup', function() {
        var scope;
        beforeEach(function() {
            scope = new Scope();
        });

        it('takes watches as an array and calls listener with arrays', function() {
            var gotNewValues, gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup(
                [
                    function(scope) { return scope.aValue; },
                    function(scope) { return scope.anotherValue; }
                ], 
                function(newValues, oldValues, scope) {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                }
            );

            scope.$digest();
            expect(gotNewValues).toEqual([1, 2]);
            expect(gotOldValues).toEqual([1, 2]);
        })

        it('only calls listener once per digest', function() {
            var counter = 0;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup(
                [
                    function(scope) { return scope.aValue; },
                    function(scope) { return scope.anotherValue; }
                ], 
                function(newValues, oldValues, scope) {
                    counter++;
                }
            );
            
            scope.$digest();
            expect(counter).toEqual(1);
        })

        it('uses the same array of old and new values on first run', function() {
            var gotNewValues, gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup([
            function(scope) { return scope.aValue; },
            function(scope) { return scope.anotherValue; }
            ], function(newValues, oldValues, scope) {
            gotNewValues = newValues;
            gotOldValues = oldValues;
            });
            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);
        })

        it('uses different arrays for old and new values on subsequent runs', function() {
            var gotNewValues, gotOldValues;
            scope.aValue = 1;
            scope.anotherValue = 2;
            scope.$watchGroup([
            function(scope) { return scope.aValue; },
            function(scope) { return scope.anotherValue; }
            ], function(newValues, oldValues, scope) {
            gotNewValues = newValues;
            gotOldValues = oldValues;
            });
            scope.$digest();
            scope.anotherValue = 3;
            scope.$digest();
            expect(gotNewValues).toEqual([1, 3]);
            expect(gotOldValues).toEqual([1, 2]);
        })


        it('calls the listener once when the watch array is empty', function() {
            var gotNewValues, gotOldValues;
            scope.$watchGroup([], function(newValues, oldValues, scope) {
            gotNewValues = newValues;
            gotOldValues = oldValues;
            });
            scope.$digest();
            expect(gotNewValues).toEqual([]);
            expect(gotOldValues).toEqual([]);
        })


        it('can be deregistered', function() {
            var counter = 0;
            scope.aValue = 1;
            scope.anotherValue = 2;
            var destroyGroup = scope.$watchGroup([
            function(scope) { return scope.aValue; },
            function(scope) { return scope.anotherValue; }
            ], function(newValues, oldValues, scope) {
            counter++;
            });
            scope.$digest();
            scope.anotherValue = 3;
            destroyGroup();
            scope.$digest();
            expect(counter).toEqual(1);
            });

            it('does not call the zero-watch listener when deregistered first', function() {
            var counter = 0;
            var destroyGroup = scope.$watchGroup([], function(newValues, oldValues, scope) {
            counter++;
            });
            destroyGroup();
            scope.$digest();
            expect(counter).toEqual(0);
        })
    })

    describe("inheritance", function() {
        it("inherits the parent's properties", function() {
var parent = new Scope();
parent.aValue = [1, 2, 3];
var child = parent.$new();
expect(child.aValue).toEqual([1, 2, 3]);
})
        it("does not cause a parent to inherit its properties", function() {
var parent = new Scope();
var child = parent.$new();
child.aValue = [1, 2, 3];
expect(parent.aValue).toBeUndefined();
})

        it("inherits the parent's properties whenever they are defined", function() {
var parent = new Scope();
var child = parent.$new();
parent.aValue = [1, 2, 3];
expect(child.aValue).toEqual([1, 2, 3]);
})

        it("can manipulate a parent scope's property", function() {
var parent = new Scope();
var child = parent.$new();
parent.aValue = [1, 2, 3];
child.aValue.push(4);
expect(child.aValue).toEqual([1, 2, 3, 4]);
expect(parent.aValue).toEqual([1, 2, 3, 4]);
})

        it("can watch a property in the parent", function() {
var parent = new Scope();
var child = parent.$new();
parent.aValue = [1, 2, 3];
child.counter = 0;
child.$watch(
function(scope) { return scope.aValue; },
function(newValue, oldValue, scope) {
scope.counter++;
},
true
);
child.$digest();
expect(child.counter).toBe(1);
parent.aValue.push(4);
child.$digest();
expect(child.counter).toBe(2);
})

        it("can be nested at any depth", function() {
var a = new Scope();
var aa = a.$new();
var aaa = aa.$new();
var aab = aa.$new();
var ab = a.$new();
var abb = ab.$new();
a.value = 1;
expect(aa.value).toBe(1);
expect(aaa.value).toBe(1);
expect(aab.value).toBe(1);
expect(ab.value).toBe(1);
expect(abb.value).toBe(1);
ab.anotherValue = 2;
expect(abb.anotherValue).toBe(2);
expect(aa.anotherValue).toBeUndefined();
expect(aaa.anotherValue).toBeUndefined();
})

it("shadows a parent's property with the same name", function() {
var parent = new Scope();
var child = parent.$new();
parent.name = 'Joe';
child.name = 'Jill';
expect(child.name).toBe('Jill');
expect(parent.name).toBe('Joe');
})

it("does not shadow members of parent scope's attributes", function() {
var parent = new Scope();
var child = parent.$new();
parent.user = {name: 'Joe'};
child.user.name = 'Jill';
expect(child.user.name).toBe('Jill');
expect(parent.user.name).toBe('Jill');
})

it("does not digest its parent(s)", function() {
var parent = new Scope();
var child = parent.$new();
parent.aValue = 'abc';
parent.$watch(
function(scope) { return scope.aValue; },
function(newValue, oldValue, scope) {
scope.aValueWas = newValue;
}
);
child.$digest();
expect(child.aValueWas).toBeUndefined();
})

it("keeps a record of its children", function() {
var parent = new Scope();
var child1 = parent.$new();
var child2 = parent.$new();
var child2_1 = child2.$new();
expect(parent.$$children.length).toBe(2);
expect(parent.$$children[0]).toBe(child1);
expect(parent.$$children[1]).toBe(child2);
expect(child1.$$children.length).toBe(0);
expect(child2.$$children.length).toBe(1);
expect(child2.$$children[0]).toBe(child2_1);
})


it("digests its children", function() {
var parent = new Scope();
var child = parent.$new();
parent.aValue = 'abc';
child.$watch(
function(scope) { return scope.aValue; },
function(newValue, oldValue, scope) {
scope.aValueWas = newValue;
}
);
parent.$digest();
expect(child.aValueWas).toBe('abc');
})

it("digests from root on $apply", function() {
var parent = new Scope();
var child = parent.$new();
var child2 = child.$new();
parent.aValue = 'abc';
parent.counter = 0;
parent.$watch(
function(scope) { return scope.aValue; },
function(newValue, oldValue, scope) {
scope.counter++;
}
);
child2.$apply(function(scope) { });
expect(parent.counter).toBe(1);
})

it("digests from root on $evalAsync", function(done) {
var parent = new Scope();
var child = parent.$new();
var child2 = child.$new();
parent.aValue = 'abc';
parent.counter = 0;
parent.$watch(
function(scope) { return scope.aValue; },
function(newValue, oldValue, scope) {
    scope.counter++;
}
);
child2.$evalAsync(function(scope) { });
setTimeout(function() {
expect(parent.counter).toBe(1);
done();
}, 50);
})

it("does not have access to parent attributes when isolated", function() {
var parent = new Scope();
var child = parent.$new(true);
parent.aValue = 'abc';
expect(child.aValue).toBeUndefined();
})

it("cannot watch parent attributes when isolated", function() {
var parent = new Scope();
var child = parent.$new(true);
parent.aValue = 'abc';
child.$watch(
function(scope) { return scope.aValue; },
function(newValue, oldValue, scope) {
scope.aValueWas = newValue;
}
);
child.$digest();
expect(child.aValueWas).toBeUndefined();
})

it("digests its isolated children", function() {
var parent = new Scope();
var child = parent.$new(true);
child.aValue = 'abc';
child.$watch(
function(scope) { return scope.aValue; },
function(newValue, oldValue, scope) {
scope.aValueWas = newValue;
}
);
parent.$digest();
expect(child.aValueWas).toBe('abc');
})


it("digests from root on $apply when isolated", function() {
var parent = new Scope();
var child = parent.$new(true);
var child2 = child.$new();
parent.aValue = 'abc';
parent.counter = 0;
parent.$watch(
function(scope) { return scope.aValue; },
function(newValue, oldValue, scope) {
scope.counter++;
}
);
child2.$apply(function(scope) { });
expect(parent.counter).toBe(1);
})

it("schedules a digest from root on $evalAsync when isolated", function(done) {
var parent = new Scope();
var child = parent.$new(true);
var child2 = child.$new();
parent.aValue = 'abc';
parent.counter = 0;
parent.$watch(
function(scope) { return scope.aValue; },
function(newValue, oldValue, scope) {
scope.counter++;
}
);
child2.$evalAsync(function(scope) { });
setTimeout(function() {
expect(parent.counter).toBe(1);
done();
}, 50);
})


it("executes $evalAsync functions on isolated scopes", function(done) {
var parent = new Scope();
var child = parent.$new(true);
child.$evalAsync(function(scope) {
scope.didEvalAsync = true;
});
setTimeout(function() {

expect(child.didEvalAsync).toBe(true);
done();
}, 50);
})


it("executes $$postDigest functions on isolated scopes", function() {
var parent = new Scope();
var child = parent.$new(true);
child.$$postDigest(function() {
child.didPostDigest = true;
});
parent.$digest();
expect(child.didPostDigest).toBe(true);
})

it('can take some other scope as the parent', function() {
var prototypeParent = new Scope();
var hierarchyParent = new Scope();
var child = prototypeParent.$new(false, hierarchyParent);
prototypeParent.a = 42;
expect(child.a).toBe(42);
child.counter = 0;
child.$watch(function(scope) {
scope.counter++;
});
prototypeParent.$digest();
expect(child.counter).toBe(0);
hierarchyParent.$digest();
expect(child.counter).toBe(1);
})

it("is no longer digested when $destroy has been called", function() {
var parent = new Scope();
var child = parent.$new();
child.aValue = [1, 2, 3];
child.counter = 0;
child.$watch(
function(scope) { return scope.aValue; },
function(newValue, oldValue, scope) {
scope.counter++;
},
true
);
parent.$digest();
expect(child.counter).toBe(1);
child.aValue.push(4);
parent.$digest();
expect(child.counter).toBe(2);
child.$destroy();
child.aValue.push(5);
parent.$digest();
expect(child.counter).toBe(2);
})


    })
})