(function () {
    'use strict';

    var Defined = {
        baseUrl: 'https://uaserial.com/'
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

            this.loading(true);
            filter.onSearch = (value) => {
                Lampa.Activity.replace({ search: value, clarification: true });
            };
            filter.onBack = this.back.bind(this);
            scroll.body().addClass('torrent-list');
            files.appendFiles(scroll.render());
            files.appendHead(filter.render());
            scroll.minus(files.render().find('.explorer__files-head'));
            scroll.body().append(Lampa.Template.get('uaserial_content_loading'));
            Lampa.Controller.enable('content');
            this.loading(false);
            this.search();
        };

        this.search = function () {
            this.reset();
            var query = object.search || object.movie.title || object.movie.name;
            var url = Defined.baseUrl + '?s=' + encodeURIComponent(query);
            this.request(url);
        };

        this.request = function (url) {
            network.native(
                'https://cors-anywhere.herokuapp.com/' + url,
                this.parse.bind(this),
                this.doesNotAnswer.bind(this),
                false,
                { dataType: 'text' }
            );
        };

        this.parse = function (response) {
            try {
                var parser = new DOMParser();
                var doc = parser.parseFromString(response, 'text/html');
                // Оновлений селектор для карток контенту
                var items = doc.querySelectorAll('.movie-item') || [];
                var videos = [];

                items.forEach(function (item) {
                    var titleEl = item.querySelector('.movie-title');
                    var linkEl = item.querySelector('a[href*=".html"]');
                    var imgEl = item.querySelector('img');

                    var title = titleEl?.textContent.trim();
                    var link = linkEl?.href;
                    var poster = imgEl?.src || '';

                    if (title && link) {
                        videos.push({
                            title: title,
                            url: link,
                            poster: poster,
                            method: 'call',
                            text: title
                        });
                    }
                });

                if (videos.length) {
                    this.display(videos);
                } else {
                    this.doesNotAnswer();
                }
            } catch (e) {
                console.error('UASerial parse error:', e);
                this.doesNotAnswer();
            }
        };

        this.getFileUrl = function (file, call) {
            network.native(
                'https://cors-anywhere.herokuapp.com/' + file.url,
                function (response) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    // Оновлений селектор для iframe плеєра
                    var iframe = doc.querySelector('.player iframe') || doc.querySelector('iframe');
                    var streamUrl = iframe?.src || '';
                    call({ url: streamUrl });
                },
                function () {
                    call({ url: '' });
                },
                false,
                { dataType: 'text' }
            );
        };

        this.display = function (videos) {
            var _this = this;
            scroll.clear();
            videos.forEach(function (element) {
                var html = Lampa.Template.get('uaserial_prestige_full', {
                    title: element.title,
                    info: element.text,
                    time: '',
                    quality: 'HD'
                });

                html.on('hover:enter', function () {
                    _this.getFileUrl(element, function (stream) {
                        if (stream.url) {
                            var play = {
                                title: element.title,
                                url: stream.url,
                                quality: 'HD'
                            };
                            Lampa.Player.play(play);
                            Lampa.Player.playlist([play]);
                        } else {
                            Lampa.Noty.show('Не вдалося отримати посилання');
                        }
                    });
                }).on('hover:focus', function (e) {
                    last = e.target;
                    scroll.update($(e.target), true);
                });

                scroll.append(html);
            });
            Lampa.Controller.enable('content');
            this.loading(false);
        };

        this.doesNotAnswer = function () {
            scroll.clear();
            var html = Lampa.Template.get('uaserial_does_not_answer', {});
            html.find('.online-empty__title').text('Немає результатів');
            html.find('.online-empty__time').text('Спробуйте пізніше');
            html.find('.online-empty__buttons').remove();
            scroll.append(html);
            this.loading(false);
        };

        this.reset = function () {
            network.clear();
            scroll.clear();
            scroll.body().append(Lampa.Template.get('uaserial_content_loading'));
        };

        this.loading = function (status) {
            if (status) this.activity.loader(true);
            else {
                this.activity.loader(false);
                this.activity.toggle();
            }
        };

        this.create = function () {
            return files.render();
        };

        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;
            if (!initialized) this.initialize();
            Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(object.movie));
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render(), files.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                up: function () {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: function () {
                    Navigator.move('down');
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right');
                    else filter.show('Фільтр', 'filter');
                },
                left: function () {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                back: this.back.bind(this)
            });
            Lampa.Controller.toggle('content');
        };

        this.back = function () {
            Lampa.Activity.backward();
        };

        this.render = function () {
            return files.render();
        };

        this.destroy = function () {
            network.clear();
            files.destroy();
            scroll.destroy();
        };
    }

    function startPlugin() {
        window.uaserial_plugin = true;

        Lampa.Template.add('uaserial_content_loading', `
            <div class="online-empty">
                <div class="broadcast__scan"><div></div></div>
                <div class="online-empty__templates">
                    <div class="online-empty-template">
                        <div class="online-empty-template__ico"></div>
                        <div class="online-empty-template__body"></div>
                    </div>
                    <div class="online-empty-template">
                        <div class="online-empty-template__ico"></div>
                        <div class="online-empty-template__body"></div>
                    </div>
                    <div class="online-empty-template">
                        <div class="online-empty-template__ico"></div>
                        <div class="online-empty-template__body"></div>
                    </div>
                </div>
            </div>
        `);

        Lampa.Template.add('uaserial_prestige_full', `
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

        Lampa.Template.add('uaserial_does_not_answer', `
            <div class="online-empty">
                <div class="online-empty__title"></div>
                <div class="online-empty__time"></div>
                <div class="online-empty__buttons"></div>
            </div>
        `);

        var manifest = {
            type: 'video',
            version: '1.0',
            name: 'UASerial',
            description: 'Плагін для перегляду контенту з uaserial.com українською',
            component: 'uaserial'
        };

        Lampa.Component.add('uaserial', component);
        Lampa.Manifest.plugins = manifest;

        var button = '<div class="full-start__button selector view--onlinev" data-subtitle="UASerial v1.0">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M8 5v14l11-7z"/>' +
            '</svg><span>Online</span></div>';

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var btn = $(button);
                btn.on('hover:enter', function () {
                    Lampa.Component.add('uaserial', component);
                    Lampa.Activity.push({
                        url: '',
                        title: 'UASerial',
                        component: 'uaserial',
                        search: e.data.movie.title,
                        movie: e.data.movie,
                        page: 1
                    });
                });
                e.object.activity.render().find('.view--torrent').before(btn);
            }
        });
    }

    if (!window.uaserial_plugin) startPlugin();
})();
