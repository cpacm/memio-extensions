import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ExtensionAuth, SiteHeader, VideoMedia, Channel, ChannelType } from '@/core/extension';


class Youtube extends Rule {

    // cache page with offset 
    pageOffsetMap: Map<number, string> = new Map<number, string>();
    channelMap: Map<string, string> = new Map<string, string>();
    youtubeKey = "";

    provideExtensionInfo(): Extension {
        let site = new Extension("youtube", "YouTube", MediaType.Video);
        site.baseUrl = "https://www.youtube.com";
        site.description = "YouTube is a video sharing service where users can watch, like, share, comment and upload their own videos.";
        site.thumbnail = "https://www.gstatic.com/youtube/img/branding/favicon/favicon_144x144_v2.png";
        site.lang = "en";
        let commonCategoryUrl = "https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=20";
        site.categoryList = [
            new SiteUrl("Popular Videos", commonCategoryUrl),
            new SiteUrl("Film & Animation", commonCategoryUrl + "&videoCategoryId=1"),
            new SiteUrl("Autos & Vehicles", commonCategoryUrl + "&videoCategoryId=2"),
            new SiteUrl("Music", commonCategoryUrl + "&videoCategoryId=10"),
            new SiteUrl("Pets & Animals", commonCategoryUrl + "&videoCategoryId=15"),
            new SiteUrl("Sports", commonCategoryUrl + "&videoCategoryId=17"),
            new SiteUrl("Short Movies", commonCategoryUrl + "&videoCategoryId=18"),
            new SiteUrl("Travel & Events", commonCategoryUrl + "&videoCategoryId=19"),
            new SiteUrl("Gaming", commonCategoryUrl + "&videoCategoryId=20"),
            new SiteUrl("Videoblogging", commonCategoryUrl + "&videoCategoryId=21"),
            new SiteUrl("People & Blogs", commonCategoryUrl + "&videoCategoryId=22"),
            new SiteUrl("Comedy", commonCategoryUrl + "&videoCategoryId=23"),
            new SiteUrl("Entertainment", commonCategoryUrl + "&videoCategoryId=24"),
            new SiteUrl("News & Politics", commonCategoryUrl + "&videoCategoryId=25"),
            new SiteUrl("Howto & Style", commonCategoryUrl + "&videoCategoryId=26"),
            new SiteUrl("Education", commonCategoryUrl + "&videoCategoryId=27"),
            new SiteUrl("Science & Technology", commonCategoryUrl + "&videoCategoryId=28"),
            new SiteUrl("Movies", commonCategoryUrl + "&videoCategoryId=30"),
            new SiteUrl("Anime/Animation", commonCategoryUrl + "&videoCategoryId=31"),
            new SiteUrl("Action/Adventure", commonCategoryUrl + "&videoCategoryId=32"),
            new SiteUrl("Classics", commonCategoryUrl + "&videoCategoryId=33"),
            new SiteUrl("Comedy", commonCategoryUrl + "&videoCategoryId=34"),
            new SiteUrl("Documentary", commonCategoryUrl + "&videoCategoryId=35"),
            new SiteUrl("Drama", commonCategoryUrl + "&videoCategoryId=36"),
            new SiteUrl("Family", commonCategoryUrl + "&videoCategoryId=37"),
            new SiteUrl("Foreign", commonCategoryUrl + "&videoCategoryId=38"),
            new SiteUrl("Horror", commonCategoryUrl + "&videoCategoryId=39"),
            new SiteUrl("Sci-Fi/Fantasy", commonCategoryUrl + "&videoCategoryId=40"),
            new SiteUrl("Thriller", commonCategoryUrl + "&videoCategoryId=41"),
            new SiteUrl("Shorts", commonCategoryUrl + "&videoCategoryId=42"),
            new SiteUrl("Shows", commonCategoryUrl + "&videoCategoryId=43"),
            new SiteUrl("Trailers", commonCategoryUrl + "&videoCategoryId=44"),
        ];
        site.channel = new Channel(ChannelType.List, "ChannelId / Handle / PlaylistId", "channelId");

        site.searchList = [
            new SiteUrl("Video Search", "https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&type=video&q={keyword}"),
        ];

        site.forceConfig = true;
        site.configParams = [
            { key: "key", value: "Google Youtube Api Key" },
        ]

        site.useGuide =
            `## How to get Google Youtube Api Key?

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project or select an existing one.
3.  In the navigation menu, go to **APIs & Services** > **Library**.
4.  Search for "YouTube Data API v3", select it, and click **Enable**.
5.  Go to **APIs & Services** > **Credentials**.
6.  Click **Create Credentials** and select **API key**.
7.  Your API key will be created. Copy it and paste it into the extension's configuration.
8.  (Optional but recommended) To prevent unauthorized use, click on the newly created API key to add restrictions. Under **API restrictions**, select **Restrict key** and choose "YouTube Data API v3" from the dropdown.

## How to get Channel ID?

1. Open your browser and go to the YouTube website.
2. Navigate to the channel you want to view.
3.  Look at the URL in your browser's address bar.
    * For a URL like *https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw*, the Channel ID is **UC_x5XG1OV2P6uZZ5FSM9Ttw**.
    * For a URL with a handle like *https://www.youtube.com/@username*, you can use **@username**.
4. Enter this Channel ID into the extension's channel field.

## How to get a Playlist ID?

1. Navigate to the playlist you want to use on YouTube.
2. The URL will look like *https://www.youtube.com/playlist?list={PlaylistID}*.
3. The Playlist ID is the string of characters after **list=**. For example, in **...list=PL4fGSI1pDJn6j_t_mK5b_f_m_p_q_w_q_**, the ID is **PL4fGSI1pDJn6j_t_mK5b_f_m_p_q_w_q_**.
4. You can use this Playlist ID in the extension to access specific playlists.
`;
        return site;
    }

    override config(form: Map<string, string>): Promise<boolean> {
        this.youtubeKey = form.get("key") || "";
        return Promise.resolve(true);
    }

    parseVideoItems(items: any): ExtensionDetail[] {
        const videos: ExtensionDetail[] = [];

        for (let item of items) {
            let videoId = "";
            if (item.id.kind) {
                // search result
                if (item.id.kind !== "youtube#video") {
                    continue;
                }
                videoId = item.id.videoId;
            } else {
                // normal video list
                videoId = item.id;
            }

            // channel video list
            if (item.contentDetails && item.contentDetails.videoId) {
                videoId = item.contentDetails.videoId;
            }

            let snippet = item.snippet;
            let title = snippet.title;
            let description = snippet.description;
            let thumbnail = snippet.thumbnails?.standard?.url ?? snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? "";
            let publishedAt = snippet.publishedAt;

            const date = new Date(publishedAt);
            const formattedDate = `${date.getFullYear()},${date.getMonth() + 1}/${date.getDate()}`;

            let videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

            let video = new ExtensionDetail(videoId, videoUrl, title);
            video.description = description;
            video.thumbnail = thumbnail;
            video.author = snippet.channelTitle;
            video.type = MediaType.Video;
            video.category = formattedDate;

            videos.push(video);
        }

        return videos;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let apiUrl = url + '&key=' + this.youtubeKey;
        if (page > 1) {
            apiUrl = apiUrl + `&pageToken=${this.pageOffsetMap.get(page) || ""}`;
        } else {
            this.pageOffsetMap.clear();
        }

        var htmlResponse = await this.client?.request({
            url: apiUrl, method: "GET",
            headers: [{ key: "Accept", value: "application/json" }]
        });
        const content = htmlResponse.body;

        let hasNextPage = false;
        var videos: ExtensionDetail[] = [];
        try {
            const json = JSON.parse(content);
            videos = this.parseVideoItems(json.items);

            // handle next page token
            if (json.nextPageToken) {
                this.pageOffsetMap.set(page + 1, json.nextPageToken);
                hasNextPage = true;
            }

        } catch (e) {
            console.log("Youtube requestItemList error:", e);
            return new ExtensionList([], page, undefined);
        }
        if (hasNextPage) {
            return new ExtensionList(videos, page, url);
        } else {
            return new ExtensionList(videos, page, undefined);
        }
    }

    async requestPlaylistIdFromChannel(channelId: string): Promise<string> {

        if (this.channelMap.has(channelId)) {
            return this.channelMap.get(channelId) || "";
        }
        let baseApi = `https://youtube.googleapis.com/youtube/v3/channels?part=contentDetails&key=${this.youtubeKey}`;
        if (channelId.startsWith("UC")) {
            baseApi = baseApi + `&id=${channelId}`;
        } else if (channelId.startsWith("@")) {
            baseApi = baseApi + `&forHandle=${encodeURIComponent(channelId)}`;
        } else if (channelId.startsWith("PL") || channelId.startsWith("UU")) {
            // playlistId directly
            this.channelMap.set(channelId, channelId);
            return channelId;
        } else {
            // try username
            baseApi = baseApi + `&forUsername=${encodeURIComponent(channelId)}`;
        }

        var htmlResponse = await this.client?.request({
            url: baseApi, method: "GET",
            headers: [{ key: "Accept", value: "application/json" }]
        });
        const content = htmlResponse.body;

        try {
            const json = JSON.parse(content);
            let playlistId = json.items[0].contentDetails.relatedPlaylists.uploads;
            this.channelMap.set(channelId, playlistId);
            return playlistId;
        } catch (e) {
            console.log("Youtube requestPlaylistIdFromChannel error:", e);
            return "";
        }
    }

    override async requestChannelList(channelId: string, page: number): Promise<ExtensionList> {
        let hasNextPage = false;

        try {
            let uploadPlayListId = await this.requestPlaylistIdFromChannel(channelId);
            if (uploadPlayListId === "") {
                return new ExtensionList([], page, undefined);
            }

            // fetch videos from upload playlist
            let playlistApiUrl = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet%2CcontentDetails&playlistId=${uploadPlayListId}&maxResults=20&key=${this.youtubeKey}`;
            if (page > 1) {
                playlistApiUrl = playlistApiUrl + `&pageToken=${this.pageOffsetMap.get(page) || ""}`;
            } else {
                this.pageOffsetMap.clear();
            }

            var playlistResponse = await this.client?.request({
                url: playlistApiUrl, method: "GET",
                headers: [{ key: "Accept", value: "application/json" }]
            });
            let playlistContent = playlistResponse.body;
            const playlistJson = JSON.parse(playlistContent);
            let videos = this.parseVideoItems(playlistJson.items);

            // handle next page token
            if (playlistJson.nextPageToken) {
                this.pageOffsetMap.set(page + 1, playlistJson.nextPageToken);
                hasNextPage = true;
            }

            if (hasNextPage) {
                return new ExtensionList(videos, page, playlistApiUrl);
            } else {
                return new ExtensionList(videos, page, undefined);
            }

        } catch (e) {
            console.log("Youtube requestItemList error:", e);
            return new ExtensionList([], page, undefined);
        }
    }

    searchPageOffsetMap: Map<number, string> = new Map<number, string>();

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        let hasNextPage = false;
        let searchApiUrl = url.replace(`{keyword}`, encodeURIComponent(keyword)) + `&key=${this.youtubeKey}`;
        if (page > 1) {
            searchApiUrl = searchApiUrl + `&pageToken=${this.searchPageOffsetMap.get(page) || ""}`;
        } else {
            this.searchPageOffsetMap.clear();
        }

        var searchResponse = await this.client?.request({
            url: searchApiUrl, method: "GET",
            headers: [{ key: "Accept", value: "application/json" }]
        });
        let content = searchResponse.body;
        const searchJson = JSON.parse(content);
        let videos = this.parseVideoItems(searchJson.items);

        // handle next page token
        if (searchJson.nextPageToken) {
            this.searchPageOffsetMap.set(page + 1, searchJson.nextPageToken);
            hasNextPage = true;
        }

        if (hasNextPage) {
            return new ExtensionList(videos, page, searchApiUrl);
        } else {
            return new ExtensionList(videos, page, undefined);
        }
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        let apiUrl = `https://www.youtube.com/embed/${id}`;
        let media = new VideoMedia(id, "", apiUrl);
        media.webPlay = true;
        return media;
    }
}


(function () {
    const youtube = new Youtube();
    youtube.init();
})();

export default Youtube;