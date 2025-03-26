(function () {
    'use strict';

    var Defined = {
        api: 'uakino',
        localhost: 'https://rc.bwa.to/',
        sources: {
            'uakino': { name: 'UAKino', url: 'https://uakino.me/', search: '?do=search&subaction=search&story=' },
            'ashdi': { name: 'Ashdi', url: 'https://ashdi.vip/', search: 'vod/search/?wd=' },
            'kinoukr': { name: 'KinoUkr', url: 'https://kinoukr.me/', search: 'search/?q=' },
            'filmix': { name: 'Filmix', url: 'https://filmix.ac/', search: 'search/?s=' }
        }
    };

    var unic_id = Lampa.Storage.get('uakino_unic_id', '');
    if (!unic_id) {
        unic_id = Lampa.Utils.uid(8).toLowerCase();
        Lampa.Storage.set('uakino_unic_id', unic_id);
    }

    function Network() {
        this.net = new Lampa.Reguest();
        this.timeout = function(time) { this.net.timeout(time); };
        this.silent = function(url, success, error) {
            this.net.silent(url, success, error, false, {
                headers: { 'Origin': Defined.localhost, 'X-Requested-With': 'XMLHttpRequest' }
            });
        };
        this.native = function(url, success, error) {
            this.net.native(url, success, error, false, {
                headers: { 'Origin': Defined.localhost, 'X-Requested-With': 'XMLHttpRequest' },
                dataType: 'text'
            });
        };
        this.clear = function() { this.net.clear(); };
    }

    function component(object) {
        var network = new Network();
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var files = new Lampa.Explorer(object);
        var filter = new Lampa.Filter(object);
        var sources = Defined.sources;
        var filter_sources = Object.keys(sources);
        var balanser = Lampa.Storage.get('online_balanser', filter_sources[0]);
        var last;

        function account(url) {
            return Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(unic_id));
        }

        this.requestParams = function() {
            var query = [];
            var title = object.movie.title || object.movie.name;
            query.push('query=' + encodeURIComponent(title));
            query.push('year=' + ((object.movie.release_date || object.movie.first_air_date || '0000') + '').slice(0, 4));
            query.push('type=' + (object.movie.name ? 'series' : 'movie'));
            if (object.movie.imdb_id) query.push('imdb=' + object.movie.imdb_id);
            if (object.movie.kinopoisk_id) query.push('kp=' + object.movie.kinopoisk_id);
            return Defined.localhost + 'search?' + query.join('&');
        };

        this.initialize = function() {
            scroll.body().addClass('torrent-list');
            files.appendFiles(scroll.render());
            files.appendHead(filter.render());
            scroll.body().append(Lampa.Template.get('lampac_content_loading'));
            Lampa.Controller.enable('content');
            this.search();
        };

        this.search = function() {
            var url = this.requestParams();
            network.timeout(10000);
            network.silent(account(url), this.parse.bind(this), this.doesNotAnswer.bind(this));
        };

        this.parse = function(data) {
            try {
                var json = Lampa.Arrays.decodeJson(data, {});
                if (!json || !json.results) {
                    this.doesNotAnswer('No valid data');
                    return;
                }

                var videos = json.results.filter(function(v) {
                    return v.url && v.source && filter_sources.includes(v.source);
                });

                if (videos.length) {
                    this.display(videos);
                } else {
                    this.empty();
                }
            } catch (e) {
                console.log('UAKinoMe', 'Parse error:', e);
                this.doesNotAnswer(e);
            }
        };

        this.display = function(videos) {
            scroll.clear();
            videos.forEach(function(video) {
                var html = Lampa.Template.get('lampac_prestige_full', {
                    title: video.title || object.movie.title,
                    info: sources[video.source]?.name || video.source,
                    time: video.quality ? video.quality + 'p' : '',
                    quality: 'HD'
                });
                html.on('hover:enter', function() {
                    Lampa.Player.play({ url: video.url, title: video.title });
                    Lampa.Player.playlist([{ url: video.url, title: video.title }]);
                });
                html.on('hover:focus', function(e) {
                    last = e.target;
                    scroll.update($(e.target), true);
                });
                scroll.append(html);
            });
            this.loading(false);
            Lampa.Controller.enable('content');
        };

        this.empty = function() {
            scroll.clear();
            var html = Lampa.Template.get('lampac_does_not_answer', {});
            html.find('.online-empty__title').text('Немає доступного контенту');
            scroll.append(html);
            this.loading(false);
        };

        this.doesNotAnswer = function(error) {
            scroll.clear();
            var html = Lampa.Template.get('lampac_does_not_answer', {});
            html.find('.online-empty__title').text('Помилка сервера');
            html.find('.online-empty__time').text(typeof error === 'string' ? error : '404 Not Found');
            scroll.append(html);
            this.loading(false);
        };

        this.loading = function(status) {
            if (status) this.activity.loader(true);
            else {
                this.activity.loader(false);
                this.activity.toggle();
            }
        };

        this.start = function() {
            if (!this.initialize) this.initialize();
            Lampa.Controller.add('content', {
                toggle: function() {
                    Lampa.Controller.collectionSet(scroll.render(), files.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                up: function() { Navigator.move('up') || Lampa.Controller.toggle('head'); },
                down: function() { Navigator.move('down'); },
                right: function() { Navigator.move('right') || filter.show('Фільтр', 'filter'); },
                left: function() { Navigator.move('left') || Lampa.Controller.toggle('menu'); },
                back: function() { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.render = function() { return files.render(); };
        this.destroy = function() {
            network.clear();
            files.destroy();
            scroll.destroy();
        };
    }

    function startPlugin() {
        window.uakino_plugin = true;
        var manifest = {
            type: 'video',
            version: '1.2',
            name: 'UAKinoMe',
            description: 'Український контент з uakino.me, ashdi.vip, kinoukr.me, filmix.ac'
        };

        Lampa.Component.add('uakino', component);
        Lampa.Manifest.plugins = manifest;

        Lampa.Template.add('lampac_content_loading', `
            <div class="online-empty">
                <div class="broadcast__scan"><div></div></div>
            </div>
        `);

        Lampa.Template.add('lampac_prestige_full', `
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

        Lampa.Template.add('lampac_does_not_answer', `
            <div class="online-empty">
                <div class="online-empty__title"></div>
                <div class="online-empty__time"></div>
            </div>
        `);

        var button = '<div class="full-start__button selector view--online" data-subtitle="UAKinoMe v1.2">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
            '<span>Онлайн</span></div>';

        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite') {
                var btn = $(button);
                btn.on('hover:enter', function() {
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
                e.object.activity.render().find('.view--torrent').after(btn);
            }
        });
    }

    if (!window.uakino_plugin) startPlugin();
})();
