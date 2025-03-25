(function () {
    'use strict';

    // Об’єкт для роботи з uakino.me
    var Uakino = {
        base_url: 'https://uakino.me', // Основний URL сайту

        // Функція пошуку контенту
        search: function (query, callback) {
            // Формуємо URL пошуку (гіпотетичний, уточніть на сайті)
            var url = this.base_url + '/search?q=' + encodeURIComponent(query);
            network.silent(url, function (result) {
                var items = [];
                // Парсимо HTML із результатами пошуку
                var html = $('<div>').html(result);
                // Припускаємо, що елементи пошуку мають клас типу '.film-item'
                html.find('.film-item').each(function () {
                    var title = $(this).find('.title').text() || $(this).find('h2').text(); // Назва фільму
                    var link = $(this).find('a').attr('href'); // Посилання на сторінку
                    var fullLink = link.startsWith('http') ? link : Uakino.base_url + link;
                    items.push({
                        title: title.trim(),
                        url: fullLink,
                        type: title.includes('сезон') ? 'series' : 'movie' // Визначаємо тип контенту
                    });
                });
                callback(items);
            }, function () {
                callback([]); // Повертаємо порожній масив у разі помилки
            });
        },

        // Функція парсингу сторінки фільму/серіалу
        parse: function (url, callback) {
            network.silent(url, function (result) {
                var html = $('<div>').html(result);
                var video_urls = [];
                // Витягуємо посилання на відео з плеєра (припускаємо тег <source>)
                html.find('.player source').each(function () {
                    var src = $(this).attr('src');
                    var quality = $(this).attr('data-quality') || 'HD'; // Якість за замовчуванням
                    video_urls.push({
                        quality: quality,
                        url: src.startsWith('http') ? src : Uakino.base_url + src
                    });
                });

                // Якщо серіал, витягуємо сезони та серії (гіпотетично)
                var seasons = [];
                html.find('.season').each(function () {
                    var season = {
                        title: $(this).find('.season-title').text(),
                        episodes: []
                    };
                    $(this).find('.episode').each(function () {
                        season.episodes.push({
                            title: $(this).find('.episode-title').text(),
                            url: $(this).find('a').attr('href')
                        });
                    });
                    seasons.push(season);
                });

                callback({
                    streams: video_urls, // Посилання на відео
                    title: html.find('h1').text().trim(), // Заголовок сторінки
                    seasons: seasons.length ? seasons : null // Сезони, якщо є
                });
            }, function () {
                callback(null); // У разі помилки
            });
        }
    };

    // Реєстрація плагіну в Lampa
    Lampa.Component.add('uakino', {
        name: 'Uakino',
        search: function (query, callback) {
            Uakino.search(query, callback);
        },
        parse: function (url, callback) {
            Uakino.parse(url, callback);
        }
    });

    // Додавання в меню налаштувань Lampa
    Lampa.Settings.add('online', {
        id: 'uakino',
        name: 'Uakino',
        enabled: true
    });
})();
