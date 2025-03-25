(function () {
    'use strict';

    // Об’єкт для роботи з uakino.me
    var Uakino = {
        base_url: 'https://uakino.me', // Базовий URL сайту

        // Функція пошуку
        search: function (query, callback) {
            console.log('Uakino: Починаємо пошук для:', query);
            // Припускаємо, що пошук на uakino.me виглядає як /search?q=запит
            var url = this.base_url + '/search?q=' + encodeURIComponent(query);
            network.silent(url, function (result) {
                console.log('Uakino: Отримано відповідь пошуку');
                var items = [];
                try {
                    var html = $('<div>').html(result);
                    // Припускаємо, що результати пошуку мають клас .shortstory або подібний
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
                    console.log('Uakino: Знайдено елементів:', items.length);
                    callback(items.length ? items : []);
                } catch (e) {
                    console.error('Uakino: Помилка парсингу пошуку:', e);
                    callback([]);
                }
            }, function () {
                console.error('Uakino: Помилка запиту до', url);
                callback([]);
            });
        },

        // Функція парсингу сторінки контенту
        parse: function (url, callback) {
            console.log('Uakino: Парсимо сторінку:', url);
            network.silent(url, function (result) {
                try {
                    var html = $('<div>').html(result);
                    var video_urls = [];
                    // Шукаємо відео в плеєрі (припускаємо типовий тег <source>)
                    html.find('#player video source').each(function () {
                        var src = $(this).attr('src');
                        if (src) {
                            var quality = $(this).attr('data-quality') || '1080p'; // За замовчуванням 1080p
                            video_urls.push({
                                quality: quality,
                                url: src.startsWith('http') ? src : Uakino.base_url + src
                            });
                        }
                    });

                    // Якщо серіал, парсимо сезони та серії
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
                        streams: video_urls.length ? video_urls : [{ quality: 'HD', url: '' }], // Запасний варіант
                        title: html.find('h1').text().trim() || 'Без назви',
                        seasons: seasons.length ? seasons : null
                    };
                    console.log('Uakino: Отримано дані:', content);
                    callback(content);
                } catch (e) {
                    console.error('Uakino: Помилка парсингу сторінки:', e);
                    callback(null);
                }
            }, function () {
                console.error('Uakino: Помилка запиту до', url);
                callback(null);
            });
        }
    };

    // Реєстрація компонента в Lampa
    try {
        Lampa.Component.add('uakino', {
            name: 'Uakino',
            search: function (query, callback) {
                Uakino.search(query, callback);
            },
            parse: function (url, callback) {
                Uakino.parse(url, callback);
            }
        });
        console.log('Uakino: Компонент зареєстровано');
    } catch (e) {
        console.error('Uakino: Помилка реєстрації компонента:', e);
    }

    // Додавання в налаштування Lampa
    try {
        Lampa.Settings.add('online', {
            id: 'uakino',
            name: 'Uakino',
            enabled: true
        });
        console.log('Uakino: Додано в налаштування');
    } catch (e) {
        console.error('Uakino: Помилка додавання в налаштування:', e);
    }

    console.log('Uakino: Плагін успішно завантажено');
})();
