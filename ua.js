(function () {
    'use strict';

    // Перевірка наявності Lampa
    if (!window.Lampa) {
        console.error('[UAKino] Lampa framework not found');
        return;
    }

    var uakino = {
        id: 'uakino',
        name: 'UAKino',
        version: '1.0.1',
        baseUrl: 'https://uakino.me',

        // Пошук контенту
        search: function (query, callback) {
            var url = this.baseUrl + '/search?query=' + encodeURIComponent(query);
            console.log('[UAKino] Searching:', url);
            
            this.fetch(url, function (response) {
                if (!response) {
                    console.error('[UAKino] No response from search');
                    return callback([]);
                }

                var results = [];
                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var items = doc.querySelectorAll('.shortstory') || []; // Оновлений селектор

                    items.forEach(function (item) {
                        try {
                            var titleEl = item.querySelector('.movietitle');
                            var linkEl = item.querySelector('a');
                            var yearEl = item.querySelector('.year');
                            var imgEl = item.querySelector('.movieimg img');

                            var title = titleEl?.textContent.trim();
                            var link = linkEl?.href;
                            var year = yearEl?.textContent.trim();
                            var img = imgEl?.src;

                            if (title && link) {
                                results.push({
                                    id: link.split('/').pop().replace('.html', ''),
                                    title: title,
                                    year: year || '',
                                    poster: img || '',
                                    type: link.includes('seriali') ? 'serial' : 'movie'
                                });
                            }
                        } catch (e) {
                            console.error('[UAKino] Item parse error:', e);
                        }
                    });

                    console.log('[UAKino] Found results:', results.length);
                    callback(results);
                } catch (e) {
                    console.error('[UAKino] Search parsing error:', e);
                    callback([]);
                }
            });
        },

        // Отримання деталей контенту
        detail: function (id, callback) {
            var url = this.baseUrl + '/' + id + '.html';
            console.log('[UAKino] Getting details:', url);

            this.fetch(url, function (response) {
                if (!response) {
                    console.error('[UAKino] No response from detail');
                    return callback(null);
                }

                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    
                    var detail = {
                        id: id,
                        title: doc.querySelector('h1[itemprop="name"]')?.textContent.trim() || '',
                        poster: doc.querySelector('.fimg img')?.src || '',
                        description: doc.querySelector('.fdesc')?.textContent.trim() || '',
                        year: doc.querySelector('.finfo span[itemprop="dateCreated"]')?.textContent.trim() || '',
                        genres: [],
                        actors: [],
                        streams: []
                    };

                    // Жанри
                    doc.querySelectorAll('.finfo a[href*="/genres/"]')?.forEach(function (genre) {
                        detail.genres.push(genre.textContent.trim());
                    });

                    // Актори
                    doc.querySelectorAll('.finfo a[href*="/actor/"]')?.forEach(function (actor) {
                        detail.actors.push(actor.textContent.trim());
                    });

                    // Потоки
                    var playerFrame = doc.querySelector('iframe[src]');
                    if (playerFrame) {
                        detail.streams.push({
                            url: playerFrame.src,
                            quality: 'HD',
                            title: 'UAKino HD'
                        });
                    }

                    console.log('[UAKino] Detail loaded:', detail.title);
                    callback(detail);
                } catch (e) {
                    console.error('[UAKino] Detail parsing error:', e);
                    callback(null);
                }
            });
        },

        // Сезони для серіалів
        seasons: function (id, callback) {
            var url = this.baseUrl + '/' + id + '.html';
            console.log('[UAKino] Getting seasons:', url);

            this.fetch(url, function (response) {
                if (!response) {
                    console.error('[UAKino] No response from seasons');
                    return callback([]);
                }

                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var seasons = [];
                    
                    var seasonTabs = doc.querySelectorAll('.season-tabs .tab');
                    if (seasonTabs.length) {
                        seasonTabs.forEach(function (season, index) {
                            var episodes = [];
                            var epList = doc.querySelectorAll(`.episode-list[data-season="${index + 1}"] .episode`);
                            
                            epList.forEach(function (ep) {
                                var epUrl = ep.querySelector('a')?.href;
                                episodes.push({
                                    id: ep.dataset.id || epUrl?.split('/').pop(),
                                    number: ep.querySelector('.ep-number')?.textContent.trim() || '',
                                    title: ep.querySelector('.ep-title')?.textContent.trim() || '',
                                    stream: epUrl || ''
                                });
                            });

                            seasons.push({
                                season: (index + 1).toString(),
                                episodes: episodes
                            });
                        });
                    }

                    console.log('[UAKino] Seasons found:', seasons.length);
                    callback(seasons);
                } catch (e) {
                    console.error('[UAKino] Seasons parsing error:', e);
                    callback([]);
                }
            });
        },

        // Fetch з проксі
        fetch: function (url, callback) {
            console.log('[UAKino] Fetching:', url);
            
            // Використання проксі для обходу CORS
            var proxyUrl = 'https://cors-anywhere.herokuapp.com/' + url;
            
            fetch(proxyUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Origin': window.location.origin
                }
            })
            .then(function (response) {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.text();
            })
            .then(function (data) {
                callback(data);
            })
            .catch(function (error) {
                console.error('[UAKino] Fetch error:', error);
                callback(null);
            });
        },

        // Ініціалізація
        init: function () {
            try {
                window.Lampa.Storage.set('online_active', this.id);
                window.Lampa.Online.register(this);
                console.log('[UAKino] Plugin initialized successfully');
            } catch (e) {
                console.error('[UAKino] Initialization error:', e);
            }
        }
    };

    // Запуск плагіна
    function initializePlugin() {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            uakino.init();
        } else {
            document.addEventListener('DOMContentLoaded', uakino.init);
        }
    }

    initializePlugin();
})();
