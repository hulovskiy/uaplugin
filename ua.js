(function () {
    'use strict';

    var uakino = {
        id: 'uakino',
        name: 'UAKino',
        version: '1.1',

        // Пошук контенту
        search: function (query, callback) {
            var url = 'https://uakino.me/index.php?do=search&subaction=search&story=' + encodeURIComponent(query);
            this.fetch(url, function (response) {
                if (!response) return callback([]);

                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var items = doc.querySelectorAll('.movie-item.shortstory') || [];
                    var results = [];

                    items.forEach(function (item) {
                        var titleEl = item.querySelector('.movie-item__title');
                        var linkEl = item.querySelector('a[href*=".html"]');
                        var imgEl = item.querySelector('.movie-item__poster img');

                        var title = titleEl?.textContent.trim();
                        var link = linkEl?.href;

                        if (title && link) {
                            results.push({
                                id: link.split('/').pop().replace('.html', ''),
                                title: title,
                                poster: imgEl?.src || '',
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

        // Деталі фільму чи серіалу
        detail: function (id, callback) {
            var url = 'https://uakino.me/' + id + '.html';
            this.fetch(url, function (response) {
                if (!response) return callback(null);

                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var detail = {
                        id: id,
                        title: doc.querySelector('.ftitle h1')?.textContent.trim() || '',
                        poster: doc.querySelector('.fposter img')?.src || '',
                        description: doc.querySelector('.fdesc-full')?.textContent.trim() || '',
                        streams: []
                    };

                    // Пошук потоків у iframe
                    var iframe = doc.querySelector('.fplayer iframe');
                    if (iframe && iframe.src) {
                        detail.streams.push({
                            url: iframe.src,
                            quality: 'HD',
                            title: 'UAKino HD'
                        });
                    }

                    // Запасний варіант: трейлер
                    if (!detail.streams.length) {
                        var trailer = doc.querySelector('iframe[src*="youtube.com"]');
                        if (trailer && trailer.src) {
                            detail.streams.push({
                                url: trailer.src,
                                quality: 'Trailer',
                                title: 'YouTube Trailer'
                            });
                        }
                    }

                    callback(detail);
                } catch (e) {
                    callback(null);
                }
            });
        },

        // Завантаження даних
        fetch: function (url, callback) {
            // Використовуємо проксі для обходу CORS
            var proxyUrl = 'https://cors-anywhere.herokuapp.com/' + url;
            fetch(proxyUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            })
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

    // Ініціалізація плагіна
    if (window.Lampa) {
        uakino.init = function () {
            window.Lampa.Online.register(this);
        };
        uakino.init();
    }
})();
