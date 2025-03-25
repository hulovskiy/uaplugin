(function () {
    'use strict';

    var Online = {
        name: 'Uakino', // Назва для відображення
        url: 'https://uakino.me', // Базовий URL

        search: function (query, cb) {
            console.log('[Uakino] Пошук:', query);
            var search_url = this.url + '/search?q=' + encodeURIComponent(query);
            network.silent(search_url, function (str) {
                var items = [];
                try {
                    var html = $('<div>').html(str);
                    html.find('.shortstory').each(function () {
                        var titleElement = $(this).find('.shortstory-title a');
                        var title = titleElement.text().trim() || 'Без назви';
                        var link = titleElement.attr('href') || '';
                        if (link) {
                            var fullLink = link.indexOf('http') === 0 ? link : Online.url + link;
                            var isSeries = title.includes('сезон') || title.includes('серія');
                            items.push({
                                title: title,
                                url: fullLink,
                                type: isSeries ? 'series' : 'movie'
                            });
                        }
                    });
                    console.log('[Uakino] Знайдено:', items.length);
                    cb(items);
                } catch (e) {
                    console.error('[Uakino] Помилка парсингу пошуку:', e);
                    cb([]);
                }
            }, function () {
                console.error('[Uakino] Помилка запиту до', search_url);
                cb([]);
            });
        },

        parse: function (url, cb) {
            console.log('[Uakino] Парсинг:', url);
            network.silent(url, function (str) {
                try {
                    var html = $('<div>').html(str);
                    var videos = [];
                    html.find('#player video source').each(function () {
                        var src = $(this).attr('src');
                        if (src) {
                            var quality = $(this).attr('data-quality') || '1080p';
                            videos.push({
                                quality: quality,
                                url: src.indexOf('http') === 0 ? src : Online.url + src
                            });
                        }
                    });

                    var seasons = [];
                    if (html.find('.season-list').length) {
                        html.find('.season-list .season').each(function () {
                            var season = {
                                title: $(this).find('.season-title').text() || 'Сезон',
                                episodes: []
                            };
                            $(this).find('.episode').each(function () {
                                var epTitle = $(this).find('.episode-title').text() || 'Серія';
                                var epUrl = $(this).find('a').attr('href') || url;
                                season.episodes.push({
                                    title: epTitle,
                                    url: epUrl.indexOf('http') === 0 ? epUrl : Online.url + epUrl
                                });
                            });
                            seasons.push(season);
                        });
                    }

                    var result = {
                        streams: videos.length ? videos : [{ quality: 'HD', url: '' }],
                        title: html.find('h1').text().trim() || 'Без назви',
                        seasons: seasons.length ? seasons : null
                    };
                    console.log('[Uakino] Дані:', result);
                    cb(result);
                } catch (e) {
                    console.error('[Uakino] Помилка парсингу:', e);
                    cb(null);
                }
            }, function () {
                console.error('[Uakino] Помилка запиту до', url);
                cb(null);
            });
        }
    };

    console.log('[Uakino] Реєстрація компонента');
    if (typeof Lampa !== 'undefined' && Lampa.Component && Lampa.Component.add) {
        Lampa.Component.add('online', Online);
        console.log('[Uakino] Компонент зареєстровано як "online"');
    } else {
        console.error('[Uakino] Помилка: Lampa.Component.add недоступний');
    }

    console.log('[Uakino] Завантаження завершено');
})();
