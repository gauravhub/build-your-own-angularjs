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

        it("may have watchers that omit the listener function", function() {
            var watchFn = jasmine.createSpy();
            scope.$watch(watchFn);
            scope.$digest();
            expect(watchFn).toHaveBeenCalled();
        })

        it("triggers chained watchers in the same digest", function() {
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
        });
    })
})