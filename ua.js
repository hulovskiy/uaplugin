(function () {
    'use strict';

    var Uakino = {
        base_url: 'https://uakino.me',

        search: function (query, callback) {
            var url = this.base_url + '/search?q=' + encodeURIComponent(query); // Перевірте правильність URL
            network.silent(url, function (result) {
                var items = [];
                try {
                    var html = $('<div>').html(result);
                    html.find('.shortstory').each(function () { // Приклад селектора для uakino.me
                        var title = $(this).find('.shortstory-title a').text() || 'Без назви';
                        var link = $(this).find('.shortstory-title a').attr('href') || '';
                        if (title && link) {
                            items.push({
                                title: title.trim(),
                                url: Uakino.base_url + link,
                                type: 'movie' // або 'series', залежно від контенту
                            });
                        }
                    });
                    callback(items.length ? items : []);
                } catch (e) {
                    console.log('Uakino search error:', e);
                    callback([]);
                }
            }, function () {
                callback([]);
            });
        },

        parse: function (url, callback) {
            network.silent(url, function (result) {
                try {
                    var html = $('<div>').html(result);
                    var video_urls = [];
                    html.find('.player video source').each(function () { // Адаптуйте селектор
                        var src = $(this).attr('src');
                        if (src) {
                            video_urls.push({
                                quality: $(this).attr('data-quality') || 'HD',
                                url: src
                            });
                        }
                    });
                    callback({
                        streams: video_urls.length ? video_urls : [{ quality: 'HD', url: '' }],
                        title: html.find('h1').text() || 'Без назви'
                    });
                } catch (e) {
                    console.log('Uakino parse error:', e);
                    callback(null);
                }
            }, function () {
                callback(null);
            });
        }
    };

    Lampa.Component.add('uakino', {
        name: 'Uakino',
        search: function (query, callback) {
            Uakino.search(query, callback);
        },
        parse: function (url, callback) {
            Uakino.parse(url, callback);
        }
    });

    Lampa.Settings.add('online', {
        id: 'uakino',
        name: 'Uakino',
        enabled: true
    });
})();
