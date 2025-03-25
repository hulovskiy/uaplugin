(function() {
    let parser = {
        name: 'Uakino.me Parser',
        version: '1.0.0',
        base_url: 'https://uakino.me',

        search: function(query, callback) {
            console.log('Searching for:', query);
            let search_url = this.base_url + '/search?query=' + encodeURIComponent(query);
            Lampa.Network.get(search_url, {}, (data) => {
                console.log('Search data received:', data);
                let results = [];
                let html = Lampa.Utils.parseHTML(data);

                html.querySelectorAll('.short-item').forEach(item => {
                    let title = item.querySelector('.short-title')?.innerText || 'Без назви';
                    let link = this.base_url + item.querySelector('a')?.getAttribute('href') || '';
                    let year = item.querySelector('.short-year')?.innerText || '';
                    console.log('Found item:', title, link);

                    if (title && link) {
                        results.push({
                            title: title,
                            url: link,
                            year: year,
                            type: link.includes('/serialy/') ? 'series' : 'movie'
                        });
                    }
                });

                console.log('Search results:', results);
                callback(results);
            }, (error) => {
                console.log('Search error:', error);
                callback([]);
            });
        },

        details: function(url, callback) {
            console.log('Fetching details for:', url);
            Lampa.Network.get(url, {}, (data) => {
                console.log('Details data received:', data);
                let html = Lampa.Utils.parseHTML(data);
                let title = html.querySelector('h1')?.innerText || 'Без назви';
                let streams = [];

                let videoElement = html.querySelector('video source') || html.querySelector('iframe');
                if (videoElement) {
                    let videoUrl = videoElement.src || videoElement.getAttribute('src');
                    if (videoUrl) {
                        streams.push({ url: videoUrl, quality: 'HD' });
                    }
                }
                console.log('Found streams:', streams);

                let episodes = [];
                if (url.includes('/serialy/')) {
                    html.querySelectorAll('.episode-item').forEach(ep => {
                        let epTitle = ep.querySelector('.episode-title')?.innerText || 'Епізод';
                        let epUrl = ep.querySelector('a')?.href || '';
                        if (epUrl) {
                            episodes.push({ title: epTitle, url: epUrl });
                        }
                    });
                }

                let result = {
                    title: title,
                    streams: streams,
                    episodes: episodes.length > 0 ? { 'Сезон 1': episodes } : null
                };
                console.log('Details result:', result);
                callback(result);
            }, (error) => {
                console.log('Details error:', error);
                callback({ streams: [], episodes: null });
            });
        }
    };

    Lampa.Parser.register(parser);
    Lampa.Online.add({
        name: 'Uakino.me',
        parser: parser,
        search: function(query, callback) { parser.search(query, callback); },
        stream: function(data, callback) { parser.details(data.url, callback); }
    });
})();
