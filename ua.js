(function() {
    let parser = {
        name: 'MyPlugin',
        search: function(query, callback) {
            callback([{
                title: 'Мій тестовий фільм',
                url: 'https://example.com/myfilm',
                type: 'movie'
            }]);
        },
        details: function(url, callback) {
            callback({
                title: 'Мій тестовий фільм',
                streams: [{
                    url: 'https://example.com/myfilm.mp4',
                    quality: 'HD'
                }]
            });
        }
    };
    Lampa.Parser.register(parser);
    Lampa.Online.add({
        name: 'MyPlugin',
        parser: parser,
        search: function(query, callback) { parser.search(query, callback); },
        stream: function(data, callback) { parser.details(data.url, callback); }
    });
})();
