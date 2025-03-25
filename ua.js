(function () {
    'use strict';

    var Online = {
        name: 'Uakino',
        url: 'https://uakino.me',

        search: function (query, cb) {
            console.log('[Uakino] Search started:', query);
            var url = this.url + '/search?q=' + encodeURIComponent(query);
            network.silent(url, function (str) {
                var videos = [];
                try {
                    var html = $('<div>').html(str);
                    html.find('.shortstory').each(function () {
                        var a = $(this).find('.shortstory-title a');
                        var title = a.text().trim() || 'No title';
                        var link = a.attr('href') || '';
                        if (link) {
                            var full_link = link.indexOf('http') === 0 ? link : Online.url + link;
                            var isSeries = title.includes('сезон') || title.includes('серія');
                            videos.push({
                                title: title,
                                url: full_link,
                                type: isSeries ? 'series' : 'movie'
                            });
                        }
                    });
                    console.log('[Uakino] Found:', videos.length);
                    cb(videos);
                } catch (e) {
                    console.error('[Uakino] Search parse error:', e);
                    cb([]);
                }
            }, function () {
                console.error('[Uakino] Search request failed:', url);
                cb([]);
            });
        },

        parse: function (url, cb) {
            console.log('[Uakino] Parse started:', url);
            network.silent(url, function (str) {
                try {
                    var html = $('<div>').html(str);
                    var videos = [];
                    html.find('#player video source').each(function () {
                        var src = $(this).attr('src');
                        if (src) {
                            var quality = $(this).attr('data-quality') || '1080p';
                            videos.push({
                                quality: quality,
                                url: src.indexOf('http') === 0 ? src : Online.url + src
                            });
                        }
                    });
                    var result = {
                        streams: videos.length ? videos : [{ quality: 'HD', url: '' }],
                        title: html.find('h1').text().trim() || 'No title'
                    };
                    console.log('[Uakino] Parsed:', result);
                    cb(result);
                } catch (e) {
                    console.error('[Uakino] Parse error:', e);
                    cb(null);
                }
            }, function () {
                console.error('[Uakino] Parse request failed:', url);
                cb(null);
            });
        }
    };

    console.log('[Uakino] Registering component');
    if (typeof Lampa !== 'undefined' && Lampa.Component && Lampa.Component.add) {
        Lampa.Component.add('online', Online);
        console.log('[Uakino] Component registered as "online"');
    } else {
        console.error('[Uakino] Error: Lampa.Component.add not available');
    }

    console.log('[Uakino] Plugin loaded');
})();
