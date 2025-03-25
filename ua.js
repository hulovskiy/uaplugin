(function () {
    'use strict';

    if (!window.Lampa) {
        console.error('[UAKino] Lampa framework not found');
        return;
    }

    var uakino = {
        id: 'uakino',
        name: 'UAKino',
        version: '1.0.2',
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
                            console.error('[UAKino] Search item error:', e);
                        }
                    });
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

                    // Парсинг потоків
                    var streams = [];
                    
                    // Спроба знайти iframe
                    var iframe = doc.querySelector('.fplayer iframe');
                    if (iframe && iframe.src) {
                        streams.push({
                            url: iframe.src,
                            quality: 'HD',
                            title: 'UAKino HD'
                        });
                    }

                    // Спроба знайти прямий потік
                    var video = doc.querySelector('video source');
                    if (video && video.src) {
                        streams.push({
                            url: video.src,
                            quality: 'HD',
                            title: 'UAKino Direct'
                        });
                    }

                    // Пошук у скриптах (деякі плеєри ховають URL у JS)
                    var scripts = doc.querySelectorAll('script');
                    scripts.forEach(function (script) {
                        var content = script.textContent;
                        if (content.includes('.mp4') || content.includes('.m3u8')) {
                            var matches = content.match(/(https?:\/\/[^\s]+\.(mp4|m3u8))/);
                            if (matches && matches[1]) {
                                streams.push({
                                    url: matches[1],
                                    quality: 'HD',
                                    title: 'UAKino Stream'
                                });
                            }
                        }
                    });

                    detail.streams = streams;
                    console.log('[UAKino] Found streams:', streams.length);

                    // Якщо немає потоків, додати трейлер як запасний варіант
                    if (!streams.length) {
                        var trailer = doc.querySelector('a[href*="youtube.com"]');
                        if (trailer) {
                            detail.streams.push({
                                url: trailer.href,
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
                if (!response) return callback([]);

                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var seasons = [];
                    
                    var seasonTabs = doc.querySelectorAll('.tabs-box .tab');
                    seasonTabs.forEach(function (season, index) {
                        var episodes = [];
                        var epList = doc.querySelectorAll(`.tabs-content[data-tab="${index + 1}"] .episode`);
                        
                        epList.forEach(function (ep) {
                            var epLink = ep.querySelector('a')?.href;
                            var streamUrl = ep.dataset?.url || epLink;
                            
                            episodes.push({
                                id: ep.dataset?.id || (epLink ? epLink.split('/').pop() : index),
                                number: ep.querySelector('.num')?.textContent.trim() || '',
                                title: ep.querySelector('.title')?.textContent.trim() || '',
                                stream: streamUrl || ''
                            });
                        });

                        if (episodes.length) {
                            seasons.push({
                                season: (index + 1).toString(),
                                episodes: episodes
                            });
                        }
                    });

                    console.log('[UAKino] Seasons found:', seasons.length);
                    callback(seasons);
                } catch (e) {
                    console.error('[UAKino] Seasons parsing error:', e);
                    callback([]);
                }
            });
        },

        fetch: function (url, callback) {
            var proxyUrl = 'https://cors-anywhere.herokuapp.com/' + url;
            fetch(proxyUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Origin': window.location.origin
                }
            })
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.text();
            })
            .then(callback)
            .catch(error => {
                console.error('[UAKino] Fetch error:', error);
                callback(null);
            });
        },

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

    function initializePlugin() {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            uakino.init();
        } else {
            document.addEventListener('DOMContentLoaded', uakino.init);
        }
    }

    initializePlugin();
})();
