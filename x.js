(function () {
    'use strict';

    var Defined = {
        baseUrl: 'https://uakino.me/',
        sources: {
            uakino: 'https://uakino.me/',
            ashdi: 'https://ashdi.vip/',
            kinoukr: 'https://kinoukr.me/',
            filmix: 'https://filmix.ac/'
        },
        proxy: 'https://cors-anywhere.herokuapp.com/' // Додано проксі для обходу CORS
    };

    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var files = new Lampa.Explorer(object);
        var filter = new Lampa.Filter(object);
        var initialized = false;
        var last;

        this.initialize = function () {
            if (initialized) return;
            initialized = true;
            console.log('Initializing UAKinoMe plugin with Ukrainian sources');
            this.loading(true);
            filter.onSearch = (value) => Lampa.Activity.replace({ search: value, clarification: true });
            filter.onBack = this.back.bind(this);
            scroll.body().addClass('torrent-list');
            files.appendFiles(scroll.render());
            files.appendHead(filter.render());
            scroll.minus(files.render().find('.explorer__files-head'));
            scroll.body().append(Lampa.Template.get('uakino_content_loading'));
            Lampa.Controller.enable('content');
            this.loading(false);
            this.search();
        };

        this.search = function () {
            this.reset();
            var query = object.search || object.movie.title || object.movie.name;
            console.log('Search query:', query);
            this.requestFromSources(query);
        };

        this.requestFromSources = function (query) {
            var _this = this;
            var sources = Object.keys(Defined.sources);
            var results = [];
            var completed = 0;

            sources.forEach(function (sourceKey) {
                var sourceUrl = Defined.sources[sourceKey];
                var searchPath = sourceKey === 'uakino' ? '?do=search&subaction=search&story=' : 'search?q=';
                var url = Defined.proxy + sourceUrl + searchPath + encodeURIComponent(query);
                console.log('Requesting from:', sourceUrl, 'via proxy:', url);

                network.native(
                    url,
                    (response) => {
                        console.log('Response from ' + sourceUrl + ':', response.substring(0, 200));
                        var parsed = _this.parse(response, sourceUrl);
                        results = results.concat(parsed);
                        completed++;
                        if (completed === sources.length) {
                            _this.processResults(results);
                        }
                    },
                    (error) => {
                        console.log('Request failed for ' + sourceUrl + ':', error);
                        completed++;
                        if (completed === sources.length) {
                            _this.processResults(results);
                        }
                    },
                    false,
                    {
                        dataType: 'text',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                        }
                    }
                );
            });
        };

        this.parse = function (response, sourceUrl) {
            try {
                var parser = new DOMParser();
                var doc = parser.parseFromString(response, 'text/html');
                var items = doc.querySelectorAll('.shortstory, .video-item, .film-item, .movie-item') || [];
                console.log('Found items from ' + sourceUrl + ':', items.length);

                var videos = [];
                items.forEach(function (item) {
                    var titleEl = item.querySelector('.th-title a, .video-title, .film-name, .movie-title a') || item.querySelector('a');
                    var linkEl = item.querySelector('.th-title a, .video-link, .film-link, .movie-link a') || item.querySelector('a');
                    var imgEl = item.querySelector('.th-img img, .video-poster, .film-poster img, .movie-poster img');
                    var langEl = item.querySelector('.lang, .language, .lang-label') || item;

                    var title = titleEl?.textContent.trim();
                    var link = linkEl?.href;
                    var poster = imgEl?.src || '';
                    var lang = langEl?.textContent?.toLowerCase().includes('ukraine') || 
                              langEl?.textContent?.toLowerCase().includes('українська') || 
                              true; // Спрощуємо: якщо немає явної мови, вважаємо українською

                    if (title && link) {
                        videos.push({
                            title: title,
                            url: link,
                            poster: poster,
                            method: 'call',
                            text: title,
                            source: sourceUrl
                        });
                        console.log('Added video from ' + sourceUrl + ':', title, link);
                    }
                });

                return videos;
            } catch (e) {
                console.error('Parse error from ' + sourceUrl + ':', e);
                return [];
            }
        };

        this.processResults = function (results) {
            if (results.length) {
                this.display(results);
            } else {
                console.log('No videos found from any source');
                this.doesNotAnswer();
            }
        };

        this.getFileUrl = function (file, call) {
            console.log('Fetching stream for:', file.url, 'from source:', file.source);
            network.native(
                Defined.proxy + file.url,
                (response) => {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var iframe = null;

                    if (file.source.includes('ashdi')) {
                        iframe = doc.querySelector('iframe[src*="ashdi.vip"]') || doc.querySelector('.movie-player iframe');
                    } else if (file.source.includes('kinoukr')) {
                        iframe = doc.querySelector('iframe[src*="kinoukr"]') || doc.querySelector('.video-frame');
                    } else if (file.source.includes('filmix')) {
                        iframe = doc.querySelector('iframe[src*="filmix"]') || doc.querySelector('.player-iframe');
                    } else if (file.source.includes('uakino')) {
                        iframe = doc.querySelector('iframe[src*="ashdi.vip"]') || doc.querySelector('.movie-player iframe');
                    }

                    var streamUrl = iframe?.src || '';
                    console.log('Stream URL from ' + file.source + ':', streamUrl);
                    if (streamUrl) {
                        call({ url: streamUrl });
                    } else {
                        console.log('No valid stream URL found from ' + file.source);
                        call({ url: '' });
                    }
                },
                (error) => {
                    console.log('Stream fetch failed from ' + file.source + ':', error);
                    call({ url: '' });
                },
                false,
                {
                    dataType: 'text',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                    }
                }
            );
        };

        this.display = function (videos) {
            console.log('Displaying videos:', videos.length);
            var _this = this;
            scroll.clear();
            videos.forEach(function (element) {
                var html = Lampa.Template.get('uakino_prestige_full', {
                    title: element.title,
                    info: element.text + ' (' + element.source.split('//')[1].split('/')[0] + ')',
                    time: '',
                    quality: 'HD'
                });
                html.on('hover:enter', () => {
                    _this.getFileUrl(element, (stream) => {
                        if (stream.url) {
                            var play = { title: element.title, url: stream.url, quality: 'HD' };
                            Lampa.Player.play(play);
                            Lampa.Player.playlist([play]);
                        } else {
                            Lampa.Noty.show('Не вдалося отримати посилання');
                        }
                    });
                }).on('hover:focus', (e) => {
                    last = e.target;
                    scroll.update($(e.target), true);
                });
                scroll.append(html);
            });
            Lampa.Controller.enable('content');
            this.loading(false);
        };

        this.doesNotAnswer = function () {
            console.log('No results to display');
            scroll.clear();
            var html = Lampa.Template.get('uakino_does_not_answer', {});
            html.find('.online-empty__title').text('Немає результатів');
            html.find('.online-empty__time').text('Джерела недоступні або немає українського контенту');
            html.find('.online-empty__buttons').remove();
            scroll.append(html);
            this.loading(false);
        };

        this.reset = function () {
            network.clear();
            scroll.clear();
            scroll.body().append(Lampa.Template.get('uakino_content_loading'));
        };

        this.loading = function (status) {
            if (status) this.activity.loader(true);
            else {
                this.activity.loader(false);
                this.activity.toggle();
            }
        };

        this.create = function () { return files.render(); };
        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;
            if (!initialized) this.initialize();
            Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(object.movie));
            Lampa.Controller.add('content', {
                toggle: () => {
                    Lampa.Controller.collectionSet(scroll.render(), files.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                up: () => Navigator.canmove('up') ? Navigator.move('up') : Lampa.Controller.toggle('head'),
                down: () => Navigator.move('down'),
                right: () => Navigator.canmove('right') ? Navigator.move('right') : filter.show('Фільтр', 'filter'),
                left: () => Navigator.canmove('left') ? Navigator.move('left') : Lampa.Controller.toggle('menu'),
                back: this.back.bind(this)
            });
            Lampa.Controller.toggle('content');
        };
        this.back = function () { Lampa.Activity.backward(); };
        this.render = function () { return files.render(); };
        this.destroy = function () {
            network.clear();
            files.destroy();
            scroll.destroy();
        };
    }

    function startPlugin() {
        window.uakino_plugin = true;

        Lampa.Template.add('uakino_content_loading', `
            <div class="online-empty">
                <div class="broadcast__scan"><div></div></div>
                <div class="online-empty__templates">
                    <div class="online-empty-template"><div class="online-empty-template__ico"></div><div class="online-empty-template__body"></div></div>
                    <div class="online-empty-template"><div class="online-empty-template__ico"></div><div class="online-empty-template__body"></div></div>
                    <div class="online-empty-template"><div class="online-empty-template__ico"></div><div class="online-empty-template__body"></div></div>
                </div>
            </div>
        `);

        Lampa.Template.add('uakino_prestige_full', `
            <div class="online-prestige online-prestige--full selector">
                <div class="online-prestige__body">
                    <div class="online-prestige__head">
                        <div class="online-prestige__title">{title}</div>
                        <div class="online-prestige__time">{time}</div>
                    </div>
                    <div class="online-prestige__footer">
                        <div class="online-prestige__info">{info}</div>
                        <div class="online-prestige__quality">{quality}</div>
                    </div>
                </div>
            </div>
        `);

        Lampa.Template.add('uakino_does_not_answer', `
            <div class="online-empty">
                <div class="online-empty__title"></div>
                <div class="online-empty__time"></div>
                <div class="online-empty__buttons"></div>
            </div>
        `);

        var manifest = {
            type: 'video',
            version: '1.2',
            name: 'UAKinoMe',
            description: 'Плагін для перегляду українського контенту з uakino.me, ashdi.vip, kinoukr.me, filmix.ac',
            component: 'uakino'
        };

        Lampa.Component.add('uakino', component);
        Lampa.Manifest.plugins = manifest;

        var button = '<div class="full-start__button selector view--onlinev" data-subtitle="UAKinoMe v1.2">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M8 5v14l11-7z"/>' +
            '</svg><span>Online</span></div>';

        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                var btn = $(button);
                btn.on('hover:enter', () => {
                    Lampa.Component.add('uakino', component);
                    Lampa.Activity.push({
                        url: '',
                        title: 'UAKinoMe',
                        component: 'uakino',
                        search: e.data.movie.title,
                        movie: e.data.movie,
                        page: 1
                    });
                });
                e.object.activity.render().find('.view--torrent').before(btn);
            }
        });
    }

    if (!window.uakino_plugin) startPlugin();
})();
