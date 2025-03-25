(function () {
    'use strict';

    // Об'єкт плагіна
    var uakino = {
        id: 'uakino',
        name: 'UAKino',
        version: '1.0.4',
        baseUrl: 'https://uakino.me',

        search: function (query, callback) {
            var url = this.baseUrl + '/search?query=' + encodeURIComponent(query);
            console.log('[UAKino] Searching:', url);

            this.fetch(url, function (response) {
                if (!response) {
                    console.error('[UAKino] Search: No response');
                    return callback([]);
                }

                var results = [];
                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var items = doc.querySelectorAll('.shortstory') || [];

                    items.forEach(function (item) {
                        var title = item.querySelector('.movietitle')?.textContent.trim();
                        var link = item.querySelector('a')?.href;
                        var year = item.querySelector('.year')?.textContent.trim();
                        var img = item.querySelector('.movieimg img')?.src;

                        if (title && link) {
                            results.push({
                                id: link.split('/').pop().replace('.html', ''),
                                title: title,
                                year: year || '',
                                poster: img || '',
                                type: link.includes('seriali') ? 'serial' : 'movie'
                            });
                        }
                    });

                    console.log('[UAKino] Search results:', results.length);
                    callback(results);
                } catch (e) {
                    console.error('[UAKino] Search parsing error:', e);
                    callback([]);
                }
            });
        },

        detail: function (id, callback) {
            var url = this.baseUrl + '/' + id + '.html';
            console.log('[UAKino] Getting details:', url);

            this.fetch(url, function (response) {
                if (!response) {
                    console.error('[UAKino] Detail: No response');
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

                    doc.querySelectorAll('.finfo a[href*="/genres/"]')?.forEach(function (genre) {
                        detail.genres.push(genre.textContent.trim());
                    });

                    doc.querySelectorAll('.finfo a[href*="/actor/"]')?.forEach(function (actor) {
                        detail.actors.push(actor.textContent.trim());
                    });

                    var streams = [];
                    var iframe = doc.querySelector('#player iframe, .fplayer iframe, .play iframe');
                    if (iframe?.src) {
                        streams.push({ url: iframe.src, quality: 'HD', title: 'UAKino HD' });
                    }

                    var video = doc.querySelector('video source, #player video source');
                    if (video?.src) {
                        streams.push({ url: video.src, quality: 'HD', title: 'UAKino Direct' });
                    }

                    var scripts = doc.querySelectorAll('script');
                    scripts.forEach(function (script) {
                        var matches = script.textContent.match(/(https?:\/\/[^\s]+\.(mp4|m3u8|hls))/i);
                        if (matches && matches[1]) {
                            streams.push({ url: matches[1], quality: 'HD', title: 'UAKino Stream' });
                        }
                    });

                    var dataUrl = doc.querySelector('[data-file], [data-url]')?.dataset;
                    if (dataUrl?.file || dataUrl?.url) {
                        streams.push({ url: dataUrl.file || dataUrl.url, quality: 'HD', title: 'UAKino Data' });
                    }

                    detail.streams = streams;
                    console.log('[UAKino] Found streams:', streams);

                    if (!streams.length) {
                        var trailer = doc.querySelector('a[href*="youtube.com"], iframe[src*="youtube.com"]');
                        if (trailer) {
                            detail.streams.push({
                                url: trailer.href || trailer.src,
                                quality: 'Trailer',
                                title: 'YouTube Trailer'
                            });
                        }
                    }

                    callback(detail);
                } catch (e) {
                    console.error('[UAKino] Detail parsing error:', e);
                    callback(null);
                }
            });
        },

        seasons: function (id, callback) {
            var url = this.baseUrl + '/' + id + '.html';
            console.log('[UAKino] Getting seasons:', url);

            this.fetch(url, function (response) {
                if (!response) {
                    console.error('[UAKino] Seasons: No response');
                    return callback([]);
                }

                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var seasons = [];

                    var seasonTabs = doc.querySelectorAll('.tabs-box .tab, .season-tabs .tab') || [];
                    if (seasonTabs.length) {
                        seasonTabs.forEach(function (season, index) {
                            var episodes = [];
                            var epList = doc.querySelectorAll(`.tabs-content[data-tab="${index + 1}"] .episode, .episode-list[data-season="${index + 1}"] .episode`) || [];

                            epList.forEach(function (ep) {
                                var epLink = ep.querySelector('a')?.href;
                                var streamUrl = ep.dataset?.url || epLink || '';

                                episodes.push({
                                    id: ep.dataset?.id || (epLink ? epLink.split('/').pop() : `${index + 1}`),
                                    number: ep.querySelector('.num')?.textContent.trim() || '',
                                    title: ep.querySelector('.title')?.textContent.trim() || `Епізод ${ep.querySelector('.num')?.textContent.trim() || ''}`,
                                    stream: streamUrl
                                });
                            });

                            if (episodes.length) {
                                seasons.push({
                                    season: (index + 1).toString(),
                                    episodes: episodes
                                });
                            }
                        });
                    } else {
                        var epList = doc.querySelectorAll('.episode-list .episode, .episodes .episode');
                        if (epList.length) {
                            var episodes = [];
                            epList.forEach(function (ep, epIndex) {
                                var epLink = ep.querySelector('a')?.href;
                                var streamUrl = ep.dataset?.url || epLink || '';

                                episodes.push({
                                    id: ep.dataset?.id || epLink?.split('/').pop() || epIndex,
                                    number: ep.querySelector('.num')?.textContent.trim() || (epIndex + 1),
                                    title: ep.querySelector('.title')?.textContent.trim() || `Епізод ${epIndex + 1}`,
                                    stream: streamUrl
                                });
                            });
                            seasons.push({
                                season: '1',
                                episodes: episodes
                            });
                        }
                    }

                    console.log('[UAKino] Seasons found:', seasons);
                    callback(seasons);
                } catch (e) {
                    console.error('[UAKino] Seasons parsing error:', e);
                    callback([]);
                }
            });
        },

        fetch: function (url, callback) {
            var proxyUrl = 'https://cors-anywhere.herokuapp.com/' + url;
            console.log('[UAKino] Fetching:', proxyUrl);

            fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
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

        init: function () {
            var self = this;
            // Додаємо затримку для впевненості, що Lampa завантажена
            function tryInit(attempts) {
                if (attempts <= 0) {
                    console.error('[UAKino] Failed to initialize: max attempts reached');
                    return;
                }

                if (window.Lampa && window.Lampa.Storage && window.Lampa.Online) {
                    try {
                        window.Lampa.Storage.set('online_active', self.id);
                        window.Lampa.Online.register(self);
                        console.log('[UAKino] Plugin initialized successfully');
                    } catch (e) {
                        console.error('[UAKino] Initialization error:', e);
                    }
                } else {
                    console.log('[UAKino] Waiting for Lampa to load... Attempts left:', attempts);
                    setTimeout(function () {
                        tryInit(attempts - 1);
                    }, 500);
                }
            }

            tryInit(10); // Спробувати 10 разів із затримкою 500мс
        }
    };

    // Запуск плагіна
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        uakino.init();
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            uakino.init();
        });
    }
})();
