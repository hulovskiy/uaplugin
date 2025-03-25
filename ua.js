(function () {
    'use strict';

    var Online = {
        name: 'Uakino',
        search: function(query, cb) {
            cb([]);
        },
        parse: function(url, cb) {
            cb(null);
        }
    };

    if (typeof Lampa !== 'undefined' && Lampa.Component && Lampa.Component.add) {
        Lampa.Component.add('online', Online);
        console.log('[Uakino] Component registered');
    } else {
        console.error('[Uakino] Lampa.Component.add not available');
    }
})();
