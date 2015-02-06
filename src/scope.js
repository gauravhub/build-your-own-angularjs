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
        this.$$applyAsyncQueue.shift()();
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
    var watch = {
        watchFn: watchFn,
        listenerFn: listenerFn || function() {},
        last: initWatchVal,
        valueEq: !!valueEq
    }
    
    this.$$watches.push(watch);
    this.$$lastDirtyWatch = null;
}

Scope.prototype.$$digestOnce = function() {
    var self = this;
    
    var oldValue, newValue, dirty;
    
    _.forEach(this.$$watches, function(watch) {
            oldValue = watch.last;
            newValue = watch.watchFn(self);
                
            if(!self.$$areEqual(newValue, oldValue, watch.valueEq)) {
                self.$$lastDirtyWatch = watch;
                watch.last = (watch.valueEq ? _.cloneDeep(newValue) : newValue);        
                watch.listenerFn(newValue, (oldValue === initWatchVal) ? newValue : oldValue, self);
                dirty = true;
            }
            else if(watch == self.$$lastDirtyWatch) {
                return false;
            }
    })

    return dirty;
}

Scope.prototype.$digest = function() {
    var dirty, ttl = 10;
    this.$$lastDirtyWatch = null;
    this.$beginPhase("$digest");

    if (this.$$applyAsyncId) {
        clearTimeout(this.$$applyAsyncId);
        this.$$flushApplyAsync();
    }

    do {
        while (this.$$evalAsyncQueue.length) {
            var asyncTask = this.$$evalAsyncQueue.shift();
            asyncTask.scope.$eval(asyncTask.expression);
        }

        dirty = this.$$digestOnce();
        ttl = ttl - 1;
        if((dirty || this.$$evalAsyncQueue.length) && !ttl) {
            this.$clearPhase();
            throw "10 digest iterations reached";
        }
    }
    while (dirty || this.$$evalAsyncQueue.length);
    this.$clearPhase();

    while (this.$$postDigestQueue.length) {
        this.$$postDigestQueue.shift()();
    }
}