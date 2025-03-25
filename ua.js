(function () {
    'use strict';

    console.log('Uakino: Початок завантаження плагіну');

    // Основний об’єкт плагіну
    var Uakino = {
        name: 'Uakino', // Назва, яка відобразиться в списку джерел
        base_url: 'https://uakino.me',

        search: function (query, callback) {
            console.log('Uakino: Пошук:', query);
            var url = this.base_url + '/search?q=' + encodeURIComponent(query);
            network.silent(url, function (result) {
                var items = [];
                try {
                    var html = $('<div>').html(result);
                    html.find('.shortstory').each(function () {
                        var titleElement = $(this).find('.shortstory-title a');
                        var title = titleElement.text().trim() || 'Без назви';
                        var link = titleElement.attr('href') || '';
                        if (link) {
                            var fullLink = link.startsWith('http') ? link : Uakino.base_url + link;
                            var isSeries = title.includes('сезон') || title.includes('серія');
                            items.push({
                                title: title,
                                url: fullLink,
                                type: isSeries ? 'series' : 'movie'
                            });
                        }
                    });
                    console.log('Uakino: Знайдено:', items.length);
                    callback(items);
                } catch (e) {
                    console.error('Uakino: Помилка парсингу пошуку:', e);
                    callback([]);
                }
            }, function () {
                console.error('Uakino: Помилка запиту до', url);
                callback([]);
            });
        },

        parse: function (url, callback) {
            console.log('Uakino: Парсинг:', url);
            network.silent(url, function (result) {
                try {
                    var html = $('<div>').html(result);
                    var video_urls = [];
                    html.find('#player video source').each(function () {
                        var src = $(this).attr('src');
                        if (src) {
                            var quality = $(this).attr('data-quality') || '1080p';
                            video_urls.push({
                                quality: quality,
                                url: src.startsWith('http') ? src : Uakino.base_url + src
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
                                    url: epUrl.startsWith('http') ? epUrl : Uakino.base_url + epUrl
                                });
                            });
                            seasons.push(season);
                        });
                    }

                    var content = {
                        streams: video_urls.length ? video_urls : [{ quality: 'HD', url: '' }],
                        title: html.find('h1').text().trim() || 'Без назви',
                        seasons: seasons.length ? seasons : null
                    };
                    console.log('Uakino: Дані:', content);
                    callback(content);
                } catch (e) {
                    console.error('Uakino: Помилка парсингу:', e);
                    callback(null);
                }
            }, function () {
                console.error('Uakino: Помилка запиту до', url);
                callback(null);
            });
        }
    };

    // Реєстрація компонента
    if (typeof Lampa !== 'undefined' && Lampa.Component && Lampa.Component.add) {
        Lampa.Component.add('online', Uakino);
        console.log('Uakino: Компонент зареєстровано як "online"');
    } else {
        console.error('Uakino: Lampa.Component.add недоступний');
    }

    console.log('Uakino: Завантаження завершено');
})();
