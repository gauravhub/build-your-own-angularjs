/* global _ */

/* jshint globalstrict: true */
'use strict';

function initWatchVal() { }

function Scope() {
    this.$$watches = [];
    this.$$lastDirtyWatch = null;
    this.$$evalAsyncQueue = [];
    this.$$applyAsyncQueue = [];
    this.$$phase = null;
    this.$$applyAsyncId = null;
    this.$$postDigestQueue = [];
    this.$$children = [];
    this.$root = this;
}

Scope.prototype.$$postDigest = function(fn) {
    this.$$postDigestQueue.push(fn);
}

Scope.prototype.$beginPhase = function(phase) {
    if (this.$$phase) {
        throw this.$$phase + ' already in progress.';
    }
    this.$$phase = phase;
}

Scope.prototype.$clearPhase = function() {
    this.$$phase = null;
}

Scope.prototype.$applyAsync = function(expr) {
    var self = this;
    self.$$applyAsyncQueue.push(
        function() {
            self.$eval(expr);
    });

    if (self.$root.$$applyAsyncId === null) {
        self.$root.$$applyAsyncId = setTimeout(
            function() {
                self.$apply(_.bind(self.$$flushApplyAsync, self));
            }, 0);
    }
}

Scope.prototype.$$flushApplyAsync = function() {
    while (this.$$applyAsyncQueue.length) {
        try {
            this.$$applyAsyncQueue.shift()();
        } 
        catch (e) {
            console.error(e);
        }
    }
    this.$root.$$applyAsyncId = null;
}

Scope.prototype.$evalAsync = function(expr) {
    var self = this;
    if (!self.$$phase && !self.$$evalAsyncQueue.length) {
        setTimeout(
            function() {
                if (self.$$evalAsyncQueue.length) {
                    self.$root.$digest();   
                }
            }, 
        0);
    }
    this.$$evalAsyncQueue.push({scope: this, expression: expr});
}

Scope.prototype.$apply = function(expr) {
    try {
        this.$beginPhase("$apply");
        return this.$eval(expr);
    } 
    finally {
        this.$clearPhase();
        this.$root.$digest();
    }
}

Scope.prototype.$$areEqual = function(newValue, oldValue, valueEq) {
    if (valueEq) {
        return _.isEqual(newValue, oldValue);
    } 
    else {
        return newValue === oldValue ||
               (
                    typeof newValue === 'number' && 
                    typeof oldValue === 'number' &&
                    isNaN(newValue) && isNaN(oldValue)
               );
    }
}

Scope.prototype.$eval = function(expr, locals) {
    return expr(this, locals);
};

Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
    var self = this;
    var watch = {
        watchFn: watchFn,
        listenerFn: listenerFn,
        valueEq: !!valueEq,
        last: initWatchVal
    };
    
    this.$$watches.unshift(watch);
    this.$root.$$lastDirtyWatch = null;
    
    return function() {
        var index = self.$$watches.indexOf(watch);
        if (index >= 0) {
            self.$$watches.splice(index, 1);
            self.$root.$$lastDirtyWatch = null;
        }
    };
}

Scope.prototype.$$digestOnce = function() {
    var dirty;
    var continueLoop = true;
    var self = this;
    this.$$everyScope(function(scope) {
        var newValue, oldValue;
        _.forEachRight(scope.$$watches, function(watch) {
            try {
                if (watch) {
                    newValue = watch.watchFn(scope);
                    oldValue = watch.last;
                    if (!scope.$$areEqual(newValue, oldValue, watch.valueEq)) {
                        scope.$root.$$lastDirtyWatch = watch;
                        watch.last = (watch.valueEq ? _.cloneDeep(newValue) : newValue);
                        watch.listenerFn(
                            newValue,
                            (oldValue === initWatchVal ? newValue : oldValue),
                            scope
                        );
                        dirty = true;
                    } 
                    else if (scope.$root.$$lastDirtyWatch === watch) {
                        continueLoop = false;
                        return false;
                    }
                }
            } 
            catch (e) {
                console.error(e);
            }
        });
        return continueLoop;
    });
    return dirty;
};

Scope.prototype.$digest = function() {
    var ttl = 10;
    var dirty;
    this.$root.$$lastDirtyWatch = null;
    this.$beginPhase('$digest');
    
    if (this.$root.$$applyAsyncId) {
        clearTimeout(this.$root.$$applyAsyncId);
        this.$$flushApplyAsync();
    }

    do {
        while (this.$$evalAsyncQueue.length) {
            try {
                var asyncTask = this.$$evalAsyncQueue.shift();
                asyncTask.scope.$eval(asyncTask.expression);
            } 
            catch (e) {
                console.error(e);
            }
        }

        dirty = this.$$digestOnce();
        
        if ((dirty || this.$$evalAsyncQueue.length) && !(ttl--)) {
            throw "10 digest iterations reached";
        }

    } 
    while (dirty || this.$$evalAsyncQueue.length);
    
    this.$clearPhase();
    
    while (this.$$postDigestQueue.length) {
        try {
            this.$$postDigestQueue.shift()();
        } 
        catch (e) {
            console.error(e);
        }
    }
}

Scope.prototype.$watchGroup = function(watchFns, listenerFn) {
    var self = this;
    var oldValues = new Array(watchFns.length);
    var newValues = new Array(watchFns.length);
    var changeReactionScheduled = false;
    var firstRun = true;

    if (watchFns.length === 0) {
        var shouldCall = true;
        self.$evalAsync(
            function() {
                if (shouldCall) {
                listenerFn(newValues, newValues, self);
            }
        });
    
        return function() {
            shouldCall = false;
        };
    }
    
    function watchGroupListener() {
        if (firstRun) {
            firstRun = false;
            listenerFn(newValues, newValues, self);
        } 
        else {
            listenerFn(newValues, oldValues, self);
        }
        changeReactionScheduled = false;
    }

    var destroyFunctions = _.map(watchFns, 
                                    function(watchFn, i) {
                                        return self.$watch(watchFn, function(newValue, oldValue) {
                                            newValues[i] = newValue;
                                            oldValues[i] = oldValue;
                                            if (!changeReactionScheduled) {
                                                changeReactionScheduled = true;
                                                self.$evalAsync(watchGroupListener);
                                            }
                                        });
                                    }
                                );
    
    return  function() {
                        _.forEach(destroyFunctions, 
                            function(destroyFunction) {
                                destroyFunction();
                            }
                        );
            };
}

Scope.prototype.$new = function(isolated, parent) {
var child;
parent = parent || this;
if (isolated) {
child = new Scope();
child.$root = parent.$root;
child.$$evalAsyncQueue = parent.$$evalAsyncQueue;
child.$$postDigestQueue = parent.$$postDigestQueue;
child.$$applyAsyncQueue = parent.$$applyAsyncQueue;
} else {
var ChildScope = function() { };
ChildScope.prototype = this;
child = new ChildScope();
}
parent.$$children.push(child);
child.$$watches = [];
child.$$children = [];
child.$parent = parent;
return child;
};

Scope.prototype.$$everyScope = function(fn) {
    if (fn(this)) {
        return this.$$children.every(
                                        function(child) {
                                            return child.$$everyScope(fn);
                                        }
                                    );
    } 
    else {
        return false;
    }
}

Scope.prototype.$destroy = function() {
if (this === this.$root) {
return;
}
var siblings = this.$parent.$$children;
var indexOfThis = siblings.indexOf(this);
if (indexOfThis >= 0) {
siblings.splice(indexOfThis, 1);
}
}