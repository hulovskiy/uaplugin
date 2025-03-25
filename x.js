(function () {
    'use strict';

    // Конфігурація
    var Defined = {
        baseUrl: 'https://uakino.me/'
    };

    // Компонент плагіна
    function component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var files = new Lampa.Explorer(object);
        var filter = new Lampa.Filter(object);

        var last;

        // Ініціалізація
        this.initialize = function () {
            this.loading(true);
            filter.onSearch = function (value) {
                Lampa.Activity.replace({
                    search: value,
                    clarification: true
                });
            };
            filter.onBack = this.start.bind(this);
            scroll.body().addClass('torrent-list');
            files.appendFiles(scroll.render());
            files.appendHead(filter.render());
            scroll.minus(files.render().find('.explorer__files-head'));
            scroll.body().append(Lampa.Template.get('uakino_content_loading'));
            Lampa.Controller.enable('content');
            this.loading(false);
            this.search();
        };

        // Пошук
        this.search = function () {
            this.reset();
            var query = object.search || object.movie.title || object.movie.name;
            var url = Defined.baseUrl + 'index.php?do=search&subaction=search&story=' + encodeURIComponent(query);
            this.request(url);
        };

        // Запит до сайту
        this.request = function (url) {
            network.native(
                'https://cors-anywhere.herokuapp.com/' + url,
                this.parse.bind(this),
                this.doesNotAnswer.bind(this),
                false,
                { dataType: 'text' }
            );
        };

        // Парсинг результатів
        this.parse = function (response) {
            try {
                var parser = new DOMParser();
                var doc = parser.parseFromString(response, 'text/html');
                var items = doc.querySelectorAll('.movie-item.shortstory') || [];
                var videos = [];

                items.forEach(function (item) {
                    var titleEl = item.querySelector('.movie-item__title');
                    var linkEl = item.querySelector('a[href*=".html"]');
                    var imgEl = item.querySelector('.movie-item__poster img');

                    var title = titleEl?.textContent.trim();
                    var link = linkEl?.href;

                    if (title && link) {
                        videos.push({
                            title: title,
                            url: link,
                            poster: imgEl?.src || '',
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
                this.doesNotAnswer();
            }
        };

        // Отримання URL потоку
        this.getFileUrl = function (file, call) {
            network.native(
                'https://cors-anywhere.herokuapp.com/' + file.url,
                function (response) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response, 'text/html');
                    var iframe = doc.querySelector('.fplayer iframe');
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

        // Відображення результатів
        this.display = function (videos) {
            var _this = this;
            scroll.clear();
            videos.forEach(function (element) {
                var html = Lampa.Template.get('uakino_prestige_full', {
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

        // Помилка
        this.doesNotAnswer = function () {
            scroll.clear();
            var html = Lampa.Template.get('uakino_does_not_answer', {});
            html.find('.online-empty__title').text('Немає результатів');
            html.find('.online-empty__time').text('Спробуйте пізніше');
            html.find('.online-empty__buttons').remove();
            scroll.append(html);
            this.loading(false);
        };

        // Очистка
        this.reset = function () {
            network.clear();
            scroll.clear();
            scroll.body().append(Lampa.Template.get('uakino_content_loading'));
        };

        // Завантаження
        this.loading = function (status) {
            if (status) this.activity.loader(true);
            else {
                this.activity.loader(false);
                this.activity.toggle();
            }
        };

        // Рендеринг
        this.create = function () {
            return files.render();
        };

        this.start = function () {
            if (!this.initialized) {
                this.initialized = true;
                this.initialize();
            }
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render(), files.render());
                    Lampa.Controller.collectionFocus(last || false, scroll.render());
                },
                up: function () {
                    Navigator.move('up');
                },
                down: function () {
                    Navigator.move('down');
                },
                right: function () {
                    filter.show('Фільтр', 'filter');
                },
                left: function () {
                    Lampa.Controller.toggle('menu');
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

    // Запуск плагіна
    function startPlugin() {
        window.uakino_plugin = true;

        // Додавання шаблонів
        Lampa.Template.add('uakino_content_loading', `
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

        // Маніфест плагіна
        var manifest = {
            type: 'video',
            version: '1.0',
            name: 'UAKino',
            description: 'Плагін для перегляду контенту з uakino.me',
            component: 'uakino'
        };

        Lampa.Component.add('uakino', component);
        Lampa.Manifest.plugins = manifest;

        // Кнопка
        var button = '<div class="full-start__button selector view--onlinev" data-subtitle="UAKino v1.0">' +
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M8 5v14l11-7z"/>' +
            '</svg><span>Online</span></div>';

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var btn = $(button);
                btn.on('hover:enter', function () {
                    Lampa.Component.add('uakino', component);
                    Lampa.Activity.push({
                        url: '',
                        title: 'UAKino',
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
