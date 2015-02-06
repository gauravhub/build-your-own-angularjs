/* global _ */

/* jshint globalstrict: true */
'use strict';

function initWatchVal() { }

function Scope() {
    this.$$watches = [];
    this.$$lastDirtyWatch = null;
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
    do {
        dirty = this.$$digestOnce();
        ttl = ttl - 1;
        if(dirty && !ttl) {
            throw "10 digest iterations reached";
        }
    }
    while(dirty)
}