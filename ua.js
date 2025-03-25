(function () {
    'use strict';

    var Online = {
        name: 'UakinoTest', // Проста назва для тесту
        search: function (query, cb) {
            console.log('[UakinoTest] Search:', query);
            cb([{ title: 'Тестовий фільм', url: 'https://uakino.me/test', type: 'movie' }]);
        },
        parse: function (url, cb) {
            console.log('[UakinoTest] Parse:', url);
            cb({ streams: [{ quality: 'HD', url: 'https://uakino.me/test.mp4' }], title: 'Тестовий фільм' });
        }
    };

    console.log('[UakinoTest] Registering component');
    if (typeof Lampa !== 'undefined' && Lampa.Component && Lampa.Component.add) {
        Lampa.Component.add('online', Online);
        console.log('[UakinoTest] Component registered as "online"');
    } else {
        console.error('[UakinoTest] Error: Lampa.Component.add not available');
    }

    console.log('[UakinoTest] Plugin loaded');
})();
