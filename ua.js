(function () {
    'use strict';

    if (typeof window.Lampa === 'undefined') {
        console.error('[UAKino] Lampa framework not found');
        return;
    }

    var uakino = {
        id: 'uakino',
        name: 'UAKino',
        version: '1.0.5',
        baseUrl: 'https://uakino.me',

        search: function (query, callback) {
            var url = this.baseUrl + '/search?query=' + encodeURIComponent(query);
            console.log('[UAKino] Search:', url);
            this.fetch(url, function (response) {
                if (!response) return callback([]);
                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var items = doc.querySelectorAll('.shortstory') || [];
                    var results = Array.from(items).map(item => {
                        var title = item.querySelector('.movietitle')?.textContent.trim();
                        var link = item.querySelector('a')?.href;
                        return title && link ? {
                            id: link.split('/').pop().replace('.html', ''),
                            title: title,
                            type: link.includes('seriali') ? 'serial' : 'movie'
                        } : null;
                    }).filter(Boolean);
                    console.log('[UAKino] Results:', results);
                    callback(results);
                } catch (e) {
                    console.error('[UAKino] Search error:', e);
                    callback([]);
                }
            });
        },

        detail: function (id, callback) {
            var url = this.baseUrl + '/' + id + '.html';
            console.log('[UAKino] Detail:', url);
            this.fetch(url, function (response) {
                if (!response) return callback(null);
                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var detail = {
                        id: id,
                        title: doc.querySelector('h1[itemprop="name"]')?.textContent.trim() || '',
                        streams: []
                    };
                    var iframe = doc.querySelector('#player iframe, .fplayer iframe');
                    if (iframe?.src) {
                        detail.streams.push({ url: iframe.src, quality: 'HD', title: 'UAKino' });
                    }
                    console.log('[UAKino] Streams:', detail.streams);
                    callback(detail);
                } catch (e) {
                    console.error('[UAKino] Detail error:', e);
                    callback(null);
                }
            });
        },

        fetch: function (url, callback) {
            var proxyUrl = 'https://cors-anywhere.herokuapp.com/' + url;
            console.log('[UAKino] Fetch:', proxyUrl);
            fetch(proxyUrl)
                .then(response => response.ok ? response.text() : Promise.reject('Fetch failed'))
                .then(callback)
                .catch(error => {
                    console.error('[UAKino] Fetch error:', error);
                    callback(null);
                });
        },

        init: function () {
            console.log('[UAKino] Initializing...');
            try {
                if (window.Lampa.Storage?.set) {
                    window.Lampa.Storage.set('online_active', this.id);
                }
                if (window.Lampa.Online?.register) {
                    window.Lampa.Online.register(this);
                    console.log('[UAKino] Registered');
                }
            } catch (e) {
                console.error('[UAKino] Init error:', e);
            }
        }
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        uakino.init();
    } else {
        document.addEventListener('DOMContentLoaded', uakino.init);
    }
})();
