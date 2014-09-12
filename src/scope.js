/* global _ */

/* jshint globalstrict: true */
'use strict';

function initWatchVal() { }

function Scope() {
    this.$$watchers = [];
}

Scope.prototype.$watch = function(watchFn, listenerFn) {
    var watcher = {
        watchFn: watchFn,
        listenerFn: listenerFn || function() {},
        last: initWatchVal
    }
    
    this.$$watchers.push(watcher);
}

Scope.prototype.$digest = function() {
    var self = this;
    
    _.forEach(this.$$watchers, function(watcher) {
        var oldValue, newValue;
        oldValue = watcher.last;
        newValue = watcher.watchFn(self);
        
        if(newValue !== oldValue)
        {
            watcher.last = newValue;        
            watcher.listenerFn(newValue, (oldValue === initWatchVal) ? newValue : oldValue, self);
        }
    })
}