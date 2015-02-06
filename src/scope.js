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

    if (self.$$applyAsyncId === null) {
        self.$$applyAsyncId = setTimeout(
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
    this.$$applyAsyncId = null;
}

Scope.prototype.$evalAsync = function(expr) {
    var self = this;
    if (!self.$$phase && !self.$$evalAsyncQueue.length) {
        setTimeout(
            function() {
                if (self.$$evalAsyncQueue.length) {
                    self.$digest();
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
        this.$digest();
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
    this.$$lastDirtyWatch = null;
    
    return function() {
        var index = self.$$watches.indexOf(watch);
        if (index >= 0) {
            self.$$watches.splice(index, 1);
            self.$$lastDirtyWatch = null;
        }
    };
}

Scope.prototype.$$digestOnce = function() {
    var self = this;
    var newValue, oldValue, dirty;
    _.forEachRight(this.$$watches, function(watch) {
        try {
            if (watch) {
                newValue = watch.watchFn(self);
                oldValue = watch.last;
                if (!self.$$areEqual(newValue, oldValue, watch.valueEq)) {
                    self.$$lastDirtyWatch = watch;
                    watch.last = (watch.valueEq ? _.cloneDeep(newValue) : newValue);
                    watch.listenerFn(
                        newValue,
                        (oldValue === initWatchVal ? newValue : oldValue),
                        self
                    );
                    dirty = true;
                } 
                else if (self.$$lastDirtyWatch === watch) {
                    return false;
                }
            }
        } 
        catch (e) {
            console.error(e);
        }
    });
    return dirty;
};

Scope.prototype.$digest = function() {
    var ttl = 10;
    var dirty;
    this.$$lastDirtyWatch = null;
    this.$beginPhase('$digest');
    
    if (this.$$applyAsyncId) {
        clearTimeout(this.$$applyAsyncId);
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
};