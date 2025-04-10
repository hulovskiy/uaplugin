(function () {
    'use strict';

    var Defined = {
        baseUrl: 'https://4kino.cc/',
        searchPath: '?do=search&subaction=search&story=',
        proxy: 'https://cors-anywhere.herokuapp.com/' // Додаємо проксі для обходу CORS
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
            console.log('Initializing 4Kino plugin');
            this.loading(true);
            filter.onSearch = (value) => Lampa.Activity.replace({ search: value, clarification: true });
            filter.onBack = this.back.bind(this);
            scroll.body().addClass('torrent-list');
            files.appendFiles(scroll.render());
            files.appendHead(filter.render());
            scroll.minus(files.render().find('.explorer__files-head'));
            scroll.body().append(Lampa.Template.get('kino_content_loading'));
            Lampa.Controller.enable('content');
            this.loading(false);
            this.search();
        };

        this.search = function () {
            this.reset();
            var query = object.search || object.movie.title || object.movie.name;
            console.log('Search query:', query);
            var url = Defined.proxy + Defined.baseUrl + Defined.searchPath + encodeURIComponent(query);
            this.request(url);
        };

        this.request = function (url) {
            console.log('Requesting via proxy:', url);
            network.native(
                url,
                (response) => {
                    console.log('Response received:', response.substring(0, 200));
                    this.parse(response);
                },
                (error) => {
                    console.log('Request failed:', error);
                    this.doesNotAnswer();
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

        this.parse = function (response) {
            try {
                var parser = new DOMParser();
                var doc = parser.parseFromString(response, 'text/html');
                var items = doc.querySelectorAll('.item.item-poster.grid-item');
                console.log('Found items:', items.length);

                if (items.length === 0) {
                    var noResults = doc.querySelector('.content__main');
                    if (noResults && noResults.textContent.includes('К сожалению, поиск по сайту не дал никаких результатов')) {
                        console.log('No search results found on site');
                        this.doesNotAnswer();
                        return;
                    }
                }

                var videos = [];
                items.forEach(function (item) {
                    var titleEl = item.querySelector('.item-poster__title');
                    var linkEl = item;
                    var imgEl = item.querySelector('.item-poster__img img');
                    var metaEl = item.querySelector('.item-poster__meta');

                    var title = titleEl?.textContent.trim();
                    var link = linkEl?.href;
                    var poster = imgEl?.src || '';
                    var meta = metaEl?.textContent.trim() || '';

                    if (title && link) {
                        videos.push({
                            title: title,
                            url: link,
                            poster: poster,
                            method: 'call',
                            text: `${title} (${meta})`
                        });
                        console.log('Added video:', title, link);
                    }
                });

                if (videos.length) {
                    this.display(videos);
                } else {
                    console.log('No videos found');
                    this.doesNotAnswer();
                }
            } catch (e) {
                console.error('Parse error:', e);
                this.doesNotAnswer();
            }
        };

        this.getFileUrl = function (file, call) {
            console.log('Fetching stream for:', file.url);
            network.native(
                Defined.proxy + file.url,
                (response) => {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var iframe = doc.querySelector('.full__video iframe');
                    var streamUrl = iframe?.src || '';
                    console.log('Stream URL:', streamUrl);
                    if (streamUrl) {
                        call({ url: streamUrl });
                    } else {
                        console.log('No valid stream URL found');
                        call({ url: '' });
                    }
                },
                (error) => {
                    console.log('Stream fetch failed:', error);
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
                var html = Lampa.Template.get('kino_prestige_full', {
                    title: element.title,
                    info: element.text,
                    time: '',
                    quality: '4K'
                });
                html.on('hover:enter', () => {
                    _this.getFileUrl(element, (stream) => {
                        if (stream.url) {
                            var play = { title: element.title, url: stream.url, quality: '4K' };
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
            var html = Lampa.Template.get('kino_does_not_answer', {});
            html.find('.online-empty__title').text('Немає результатів');
            html.find('.online-empty__time').text('Спробуйте змінити запит або перевірте підключення');
            html.find('.online-empty__buttons').remove();
            scroll.append(html);
            this.loading(false);
        };

        this.reset = function () {
            network.clear();
            scroll.clear();
            scroll.body().append(Lampa.Template.get('kino_content_loading'));
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
        window.kino_plugin = true;

        Lampa.Template.add('kino_content_loading', `
            <div class="online-empty">
                <div class="broadcast__scan"><div></div></div>
                <div class="online-empty__templates">
                    <div class="online-empty-template"><div class="online-empty-template__ico"></div><div class="online-empty-template__body"></div></div>
                    <div class="online-empty-template"><div class="online-empty-template__ico"></div><div class="online-empty-template__body"></div></div>
                    <div class="online-empty-template"><div class="online-empty-template__ico"></div><div class="online-empty-template__body"></div></div>
                </div>
            </div>
        `);

        Lampa.Template.add('kino_prestige_full', `
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

        Lampa.Template.add('kino_does_not_answer', `
            <div class="online-empty">
                <div class="online-empty__title"></div>
                <div class="online-empty__time"></div>
                <div class="online-empty__buttons"></div>
            </div>
        `);

        var manifest = {
            type: 'video',
            version: '1.1',
            name: '4Kino',
            description: 'Плагін для перегляду контенту з 4kino.cc у 4K якості',
            component: 'kino'
        };

        Lampa.Component.add('kino', component);
        Lampa.Manifest.plugins = manifest;

        var button = '<div class="full-start__button selector view--onlinev" data-subtitle="4Kino v1.1">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M8 5v14l11-7z"/>' +
            '</svg><span>Online</span></div>';

        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                var btn = $(button);
                btn.on('hover:enter', () => {
                    Lampa.Component.add('kino', component);
                    Lampa.Activity.push({
                        url: '',
                        title: '4Kino',
                        component: 'kino',
                        search: e.data.movie.title,
                        movie: e.data.movie,
                        page: 1
                    });
                });
                e.object.activity.render().find('.view--torrent').before(btn);
            }
        });
    }

    if (!window.kino_plugin) startPlugin();
})();
