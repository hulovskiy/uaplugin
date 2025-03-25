// online_mod.js для uakino.me та Lampa.mx
(function () {
    'use strict';

    var uakino = {
        id: 'uakino',
        name: 'UAKino',
        version: '1.0.0',
        baseUrl: 'https://uakino.me',

        // Пошук контенту
        search: function (query, callback) {
            var url = this.baseUrl + '/search?query=' + encodeURIComponent(query);
            this.fetch(url, function (response) {
                var results = [];
                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var items = doc.querySelectorAll('.movie-item');
                    
                    items.forEach(function (item) {
                        var title = item.querySelector('.movie-title')?.textContent.trim();
                        var link = item.querySelector('a')?.href;
                        var year = item.querySelector('.movie-year')?.textContent.trim();
                        var img = item.querySelector('img')?.src;

                        if (title && link) {
                            results.push({
                                id: link.split('/').pop(),
                                title: title,
                                year: year || '',
                                poster: img || '',
                                type: link.includes('serial') ? 'serial' : 'movie'
                            });
                        }
                    });
                } catch (e) {
                    console.error('[UAKino] Search error:', e);
                }
                callback(results);
            });
        },

        // Отримання деталей контенту
        detail: function (id, callback) {
            var url = this.baseUrl + '/movie/' + id;
            this.fetch(url, function (response) {
                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    
                    var detail = {
                        id: id,
                        title: doc.querySelector('.movie-full__title')?.textContent.trim() || '',
                        poster: doc.querySelector('.movie-full__poster img')?.src || '',
                        description: doc.querySelector('.movie-full__desc')?.textContent.trim() || '',
                        year: doc.querySelector('.movie-full__year')?.textContent.trim() || '',
                        genres: [],
                        actors: [],
                        streams: []
                    };

                    // Парсинг жанрів
                    doc.querySelectorAll('.movie-full__genres a').forEach(function (genre) {
                        detail.genres.push(genre.textContent.trim());
                    });

                    // Парсинг акторів
                    doc.querySelectorAll('.movie-full__actors a').forEach(function (actor) {
                        detail.actors.push(actor.textContent.trim());
                    });

                    // Парсинг посилань на відтворення
                    var playerUrl = doc.querySelector('.movie-full__player')?.dataset.url;
                    if (playerUrl) {
                        detail.streams.push({
                            url: playerUrl,
                            quality: 'HD',
                            title: 'UAKino HD'
                        });
                    }

                    callback(detail);
                } catch (e) {
                    console.error('[UAKino] Detail error:', e);
                    callback(null);
                }
            });
        },

        // Отримання потоків для серіалів
        seasons: function (id, callback) {
            var url = this.baseUrl + '/serial/' + id;
            this.fetch(url, function (response) {
                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var seasons = [];
                    
                    doc.querySelectorAll('.season-item').forEach(function (season) {
                        var seasonNum = season.dataset.season;
                        var episodes = [];
                        
                        season.querySelectorAll('.episode-item').forEach(function (ep) {
                            episodes.push({
                                id: ep.dataset.id,
                                number: ep.dataset.number,
                                title: ep.textContent.trim(),
                                stream: ep.dataset.url
                            });
                        });

                        seasons.push({
                            season: seasonNum,
                            episodes: episodes
                        });
                    });

                    callback(seasons);
                } catch (e) {
                    console.error('[UAKino] Seasons error:', e);
                    callback([]);
                }
            });
        },

        // Допоміжна функція для HTTP-запитів
        fetch: function (url, callback) {
            fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            })
            .then(function (response) { return response.text(); })
            .then(callback)
            .catch(function (error) {
                console.error('[UAKino] Fetch error:', error);
                callback(null);
            });
        },

        // Ініціалізація плагіна
        init: function () {
            if (window.Lampa) {
                window.Lampa.Storage.set('online_active', this.id);
                window.Lampa.Online.register(this);
                console.log('[UAKino] Plugin initialized');
            }
        }
    };

    // Реєстрація плагіна в Lampa
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        uakino.init();
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            uakino.init();
        });
    }
})();
