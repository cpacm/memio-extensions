import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, MediaType, ArticleMedia, ExtensionAuth, Channel, ChannelType } from '@/core/extension';
import { formatDateToYMD } from '@/utils/date';

class Bsky extends Rule {

    feedPageCursorMap: Map<string, string> = new Map<string, string>();

    provideExtensionInfo(): Extension {
        let site = new Extension("bsky", "Bluesky", MediaType.Article)
        site.baseUrl = "https://bsky.app";
        site.description = "Social media as it should be. Find your community among millions of users, unleash your creativity, and have some fun again.";
        site.thumbnail = "https://web-cdn.bsky.app/static/favicon-32x32.png";
        site.lang = "en";
        site.categoryList = [
            { name: "Discover", url: "did:plc:z72i7hdynmk6r22z27h6tvur" },
            { name: "Bluesky Feeds and Trends", url: "did:plc:dnne5gbk6yjt4ej7as4x3ikl" },
        ];

        site.channel = new Channel(ChannelType.List, "Feed URL", "feed");

        site.forceLogin = true;
        site.loginParams = [
            { key: "identifier", value: "User Handle" },
            { key: "password", value: "User Password" }
        ];

        site.useGuide = `## How to get User Identifier
1. Open the Bluesky app or website and log in to your account.
2. Navigate to your profile page.
3. Look at the URL in the address bar. It should look something like this: https://bsky.app/profile/cpacm.bsky.social.
4. The part after /profile/ (in this case, cpacm.bsky.social) is your User Identifier.
5. Copy this User Identifier and paste it into the extension settings.
6. BlueSky authorization is valid for a short period, you should re-login after enter this extension.

## How to get Feed URL

1. Visit a user's profile page, for example: https://bsky.app/profile/emilysue.bsky.social.
2. Open the page source and search for "did:plc:". You will find a string similar to "did:plc:z72i7hdynmk6r22z27h6tvur".
3. Paste this string into the Feed URL field in the extension settings.

`;
        return site;
    }

    override async loginForm(form: Map<string, string>): Promise<ExtensionAuth> {
        let identifier = form.get("identifier") || "";
        let password = form.get("password") || "";

        let api = "https://auriporia.us-west.host.bsky.network/xrpc/com.atproto.server.createSession"
        let body = {
            identifier: identifier,
            password: password
        };

        var jsonResponse = await this.client.request({
            url: api,
            method: "POST",
            body: JSON.stringify(body),
            contentType: "application/json",
            headers: [
                { key: "accept", value: "application/json" },
            ],
        });

        let responseData = JSON.parse(jsonResponse.body);
        console.log(jsonResponse.body);
        let accessJwt = responseData.accessJwt;
        let auth = new ExtensionAuth();
        auth.headers.push({ key: "Authorization", value: `Bearer ${accessJwt}` });

        return auth;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let feed = encodeURIComponent(url)
        // https://auriporia.us-west.host.bsky.network/xrpc/app.bsky.feed.getAuthorFeed?actor=did:plc:z72i7hdynmk6r22z27h6tvur&filter=posts_and_author_threads&includePins=true&limit=30
        let api = `https://auriporia.us-west.host.bsky.network/xrpc/app.bsky.feed.getAuthorFeed?actor=${feed}&filter=posts_and_author_threads&limit=30`
        if (page == 1) {
            this.feedPageCursorMap.delete(feed);
        } else {
            let cursor = this.feedPageCursorMap.get(feed);
            if (cursor) {
                api += `&cursor=${cursor}`;
            }
        }

        var jsonResponse = await this.client?.request({ url: api, method: "GET" });
        let items: ExtensionDetail[] = [];

        let responseData = JSON.parse(jsonResponse.body);
        let feedItems = responseData.feed;
        feedItems.forEach((element: any) => {
            let post = element.post;
            let url = post.uri;
            // at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3m6zx562tss2c -> 3m6zx562tss2c
            let id = url.split("/").pop();

            let author = post.author.displayName;
            let category = "@" + post.author.handle;
            let content = post.record.text || "";
            let date = post.record.createdAt;
            let dateTxt = formatDateToYMD(date);
            let embed = post.embed;
            let thumbnail = "";
            if (embed && embed.images) {
                thumbnail = embed.images[0].thumb;
            }
            if (embed && embed.playlist) {
                thumbnail = embed.thumbnail;
            }
            if (embed && embed.external) {
                thumbnail = embed.external.thumb || "";
            }

            let detail = new ExtensionDetail(id, url, author);
            detail.author = category;
            detail.description = content;
            detail.category = dateTxt;
            detail.thumbnail = thumbnail;
            detail.type = MediaType.Article;

            items.push(detail);
        });

        let hasNext = responseData.cursor && items.length == 30;

        // save cursor
        if (hasNext) {
            this.feedPageCursorMap.set(feed, responseData.cursor);
        }

        return new ExtensionList(items, page, hasNext ? responseData.cursor : undefined);
    }

    override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        return this.requestItemList(key, page);
    }


    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        // https://auriporia.us-west.host.bsky.network/xrpc/app.bsky.unspecced.getPostThreadV2?anchor=at%3A%2F%2Fsetouchiandore.bsky.social%2Fapp.bsky.feed.post%2F3m75etisuc22r&branchingFactor=1&below=10&sort=top
        let api = `https://auriporia.us-west.host.bsky.network/xrpc/app.bsky.unspecced.getPostThreadV2?anchor=${encodeURIComponent(url)}&branchingFactor=1&below=10&sort=top`
        var jsonResponse = await this.client?.request({ url: api, method: "GET" });
        let responseData = JSON.parse(jsonResponse.body);

        let post = responseData.thread[0].value.post;

        let uri = post.uri;
        // at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3m6zx562tss2c -> 3m6zx562tss2c
        let postId = uri.split("/").pop();

        let author = post.author.displayName;
        let title = post.record.text || "";
        let content = `<p>` + post.record.text + `</p>`;
        let date = post.record.createdAt;
        let dateTxt = formatDateToYMD(date);
        let embed = post.embed;

        if (embed && embed.images) {
            embed.images.forEach((element: any) => {
                // https://cdn.bsky.app/img/feed_thumbnail/plain/did:plc:227elnhync3rwi66l2fgw3n2/bafkreiczacuh227dvgnhromwqvb3agpuxkviswqydymphusp4ny3iymfdy@jpeg
                content += `<br/><p><img src="${element.fullsize}" /></p>`;
            });
        }

        if (embed && embed.playlist) {
            let playlist = embed.playlist;
            let thumbnail = embed.thumbnail;
            content += `<br/><video controls ${thumbnail ? `poster="${thumbnail}"` : ""} >
                <source src="${playlist.url}">
                Your browser does not support the video tag.
            </video>`;
        }

        if (embed && embed.external) {
            let title = embed.external.title || "";
            let frameUri = embed.external.uri || "";
            let description = embed.external.description || "";
            let thumb = embed.external.thumb || "";

            let iframeContent = `<iframe src="${frameUri}" title="${title}" width="100%" height="400px" poster="${thumb}"></iframe>`;

            content += `<br/><h3>${title}</h3><p>${description}</p><br/>${iframeContent}`;
        }

        if (embed && embed.record) {
            let record = embed.record;
            let handle = record.author.handle;
            let postUri = record.uri.split("/").pop();
            let recordUrl = `https://bsky.app/profile/${handle}/post/${postUri}`;

            let displayName = record.author.displayName;
            let recContent = record.value.text || "";
            content += `<br/><a href="${recordUrl}">@${displayName}</a>: <p>${recContent}</p>`;
        }

        let indeedTitle = title.length < 30 ? title : title.substring(0, 30);
        let media = new ArticleMedia(id, indeedTitle, content);
        media.author = author;
        media.date = dateTxt;
        media.isMarkdown = false;

        return media;
    }
}

(function () {
    let rule = new Bsky();
    rule.init();
})();

export default Bsky;