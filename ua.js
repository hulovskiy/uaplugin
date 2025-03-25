(function () {
    'use strict';

    // Основний об’єкт плагіну
    var Uakino = {
        base_url: 'https://uakino.me',

        // Ініціалізація (аналогічно online_mod.js)
        init: function () {
            console.log('Uakino: Ініціалізація плагіну');
        },

        // Пошук контенту
        search: function (query, callback) {
            console.log('Uakino: Пошук для:', query);
            var url = this.base_url + '/search?q=' + encodeURIComponent(query);
            network.silent(url, function (result) {
                var items = [];
                try {
                    var html = $('<div>').html(result);
                    // Парсинг результатів пошуку (селектори仮定)
                    html.find('.shortstory').each(function () {
                        var titleElement = $(this).find('.shortstory-title a');
                        var title = titleElement.text().trim();
                        var link = titleElement.attr('href');
                        if (title && link) {
                            var fullLink = link.startsWith('http') ? link : Uakino.base_url + link;
                            var isSeries = title.includes('сезон') || title.includes('серія');
                            items.push({
                                title: title,
                                url: fullLink,
                                type: isSeries ? 'series' : 'movie'
                            });
                        }
                    });
                    console.log('Uakino: Знайдено:', items.length, 'елементів');
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

        // Парсинг сторінки контенту
        parse: function (url, callback) {
            console.log('Uakino: Парсинг:', url);
            network.silent(url, function (result) {
                try {
                    var html = $('<div>').html(result);
                    var video_urls = [];
                    // Парсинг відео (селектори仮定)
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

                    // Парсинг серіалів (якщо є)
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

    // Реєстрація компонента (точно як у online_mod.js)
    Lampa.Component.add('online', Uakino);
    console.log('Uakino: Компонент зареєстровано як "online"');

    // Додавання в налаштування (точно як у online_mod.js)
    Lampa.Settings.add('online', {
        id: 'uakino',
        name: 'Uakino',
        enabled: true
    });
    console.log('Uakino: Додано в налаштування як "Uakino"');

    console.log('Uakino: Плагін повністю завантажено');
})();
