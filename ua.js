(function () {
    'use strict';

    var uakino = {
        id: 'uakino',
        name: 'UAKino',
        version: '1.0',

        search: function (query, callback) {
            var url = 'https://uakino.me/search?query=' + encodeURIComponent(query);
            this.fetch(url, function (response) {
                var results = [];
                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var items = doc.querySelectorAll('.shortstory');
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
                    callback([]);
                }
            });
        },

        detail: function (id, callback) {
            var url = 'https://uakino.me/' + id + '.html';
            this.fetch(url, function (response) {
                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var detail = {
                        id: id,
                        title: doc.querySelector('h1[itemprop="name"]')?.textContent.trim() || '',
                        streams: []
                    };
                    var iframe = doc.querySelector('#player iframe, .fplayer iframe');
                    if (iframe && iframe.src) {
                        detail.streams.push({
                            url: iframe.src,
                            quality: 'HD',
                            title: 'UAKino'
                        });
                    }
                    callback(detail);
                } catch (e) {
                    callback(null);
                }
            });
        },

        fetch: function (url, callback) {
            fetch('https://cors-anywhere.herokuapp.com/' + url)
                .then(function (response) {
                    if (!response.ok) throw new Error('Fetch failed');
                    return response.text();
                })
                .then(callback)
                .catch(function () {
                    callback(null);
                });
        }
    };

    if (window.Lampa) {
        uakino.init = function () {
            window.Lampa.Online.register(this);
        };
        uakino.init();
    }
})();
