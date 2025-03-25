(function () {
    'use strict';

    if (typeof window.Lampa === 'undefined') {
        console.error('[UAKino] Lampa framework not found');
        return;
    }

    var uakino = {
        id: 'uakino',
        name: 'UAKino',
        version: '1.0.4',
        baseUrl: 'https://uakino.me',

        search: function (query, callback) {
            var url = this.baseUrl + '/search?query=' + encodeURIComponent(query);
            console.log('[UAKino] Searching:', url);
            this.fetch(url, function (response) {
                if (!response) return callback([]);
                var results = [];
                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var items = doc.querySelectorAll('.shortstory') || [];
                    items.forEach(function (item) {
                        var title = item.querySelector('.movietitle')?.textContent.trim();
                        var link = item.querySelector('a')?.href;
                        if (title && link) {
                            results.push({
                                id: link.split('/').pop().replace('.html', ''),
                                title: title,
                                type: link.includes('seriali') ? 'serial' : 'movie'
                            });
                        }
                    });
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
                    var iframe = doc.querySelector('#player iframe');
                    if (iframe?.src) {
                        detail.streams.push({ url: iframe.src, quality: 'HD', title: 'UAKino' });
                    }
                    callback(detail);
                } catch (e) {
                    console.error('[UAKino] Detail error:', e);
                    callback(null);
                }
            });
        },

        fetch: function (url, callback) {
            var proxyUrl = 'https://cors-anywhere.herokuapp.com/' + url;
            fetch(proxyUrl)
                .then(response => response.text())
                .then(callback)
                .catch(error => {
                    console.error('[UAKino] Fetch error:', error);
                    callback(null);
                });
        },

        init: function () {
            try {
                console.log('[UAKino] Initializing...');
                window.Lampa.Storage.set('online_active', this.id);
                window.Lampa.Online.register(this);
                console.log('[UAKino] Registered');
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
