import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia, ExtensionAuth, SiteHeader, ChannelType,Channel } from '@/core/extension';

class RedNote extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("rednote", "小红书", MediaType.Article);
        site.baseUrl = "https://www.xiaohongshu.com";
        site.description = "小红书 - 中国的社交媒体平台，分享生活方式和购物体验";
        site.thumbnail = "https://www.xiaohongshu.com/favicon.ico";
        site.lang = "zh";
        site.categoryList = [
            new SiteUrl("推荐", site.baseUrl + "/explore?channel_id=homefeed_recommend"),
            new SiteUrl("穿搭", site.baseUrl + "/explore?channel_id=homefeed.fashion_v3"),
            new SiteUrl("美食", site.baseUrl + "/explore?channel_id=homefeed.food_v3"),
            new SiteUrl("彩妆", site.baseUrl + "/explore?channel_id=homefeed.cosmetics_v3"),
            new SiteUrl("影视", site.baseUrl + "/explore?channel_id=homefeed.movie_and_tv_v3"),
            new SiteUrl("职场", site.baseUrl + "/explore?channel_id=homefeed.career_v3"),
            new SiteUrl("情感", site.baseUrl + "/explore?channel_id=homefeed.love_v3"),
            new SiteUrl("家居", site.baseUrl + "/explore?channel_id=homefeed.household_product_v3"),
            new SiteUrl("游戏", site.baseUrl + "/explore?channel_id=homefeed.gaming_v3"),
            new SiteUrl("旅行", site.baseUrl + "/explore?channel_id=homefeed.travel_v3"),
            new SiteUrl("健身", site.baseUrl + "/explore?channel_id=homefeed.fitness_v3"),
        ];
        site.channel = new Channel(ChannelType.List, "用户ID", "userId");

        site.forceLogin = true;
        site.loginParams = [
            { key: "cookie", value: "用户Cookie值(web_session=xxxxxx;)" },
        ];

        site.useGuide =
            `## 如何获取小红书 Cookie？

1. 打开浏览器，登录你的小红书账号。
2. 进入开发者工具（通常可以通过按 F12 或右键点击页面选择“检查”来打开）。
3. 在开发者工具中，找到“应用程序”或“存储”选项卡。
4. 在左侧菜单中，选择“Cookie”，然后选择“小红书”的域名（xiaohongshu.com）。
5. 找到名为“web_session”的 Cookie 值。
6. 将该值复制并粘贴到扩展的登录表单中对应的字段，输入格式为 web_session=xxxxxx; 。

> 注意：请确保妥善保管你的 Cookie 信息，避免泄露给他人以保护你的账号安全。

## 如何获取用户ID？

1. 打开浏览器，访问小红书网站。
2. 访问要查看的用户个人空间，URL 格式通常为：https://www.xiaohongshu.com/user/profile/{用户ID}。
3. 从 URL 中提取数字和字母组合部分，这就是该用户的用户ID。例如，在 https://www.xiaohongshu.com/user/profile/675befb4000000001801ce6f 中，用户ID 是 675befb4000000001801ce6f。
4. 将该用户ID 输入到扩展的频道字段中。
`;


        return site;
    }

    override async loginForm(form: Map<string, string>): Promise<ExtensionAuth> {
        const cookie = form.get("cookie") || "";
        const auth = new ExtensionAuth();
        auth.headers.push(new SiteHeader("Cookie", cookie));
        return auth;
    }

    searchHtmlScriptElement(html: string): string {
        let $nodes = $(html);
        let jsonString = "";
        $nodes.each((index, element) => {
            if (element instanceof HTMLScriptElement) {
                let scriptContent = element.innerHTML;
                if (scriptContent.includes("window.__INITIAL_STATE__")) {
                    jsonString = scriptContent.replace('window.__INITIAL_STATE__=', '').replace(/undefined/g, "null");
                    return false; // Exit the each loop
                }
            }
        });
        return jsonString;
    }

    async requestItemList(url: string, page: number): Promise<ExtensionList> {
        var htmlResponse = await this.client?.request({ url: url, method: "GET" });
        var html = htmlResponse.body;
        const jsonString = this.searchHtmlScriptElement(html);
        if (!jsonString || jsonString === "") {
            return new ExtensionList([], page, url);
        }
        var articles: ExtensionDetail[] = [];

        try {
            const data = JSON.parse(jsonString);
            const items = data.feed.feeds;

            articles = items.map((item: any) => {
                const note = item.noteCard;
                const noteId = item.id.toString();
                const cover = decodeURIComponent(note.cover.urlDefault);
                const author = note.user.nickname;
                const title = note.displayTitle;
                const xsec_token = item.xsecToken;
                const url = this.site.baseUrl + `/explore/${noteId}?xsec_token=${xsec_token}`;
                const detail = new ExtensionDetail(noteId, url, title);
                detail.thumbnail = cover;
                detail.author = author;
                detail.type = MediaType.Article;
                return detail;
            });
        } catch (e) {
            console.error("Failed to parse JSON data:", e);
        }

        const extensionList = new ExtensionList(articles, page, url);
        return extensionList;
    }

    async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        const realUrl = this.site.baseUrl + "/user/profile/{userid}".replace("{userid}", key);
        var htmlResponse = await this.client?.request({ url: realUrl, method: "GET" });
        var html = htmlResponse.body;
        const jsonString = this.searchHtmlScriptElement(html);
        if (!jsonString || jsonString === "") {
            return new ExtensionList([], page, undefined);
        }
        var articles: ExtensionDetail[] = [];

        try {
            const data = JSON.parse(jsonString);
            const items = data.user.notes[0];

            articles = items.map((item: any) => {
                const note = item.noteCard;
                const noteId = item.id.toString();
                const cover = decodeURIComponent(note.cover.urlDefault);
                const author = note.user.nickname;
                const title = note.displayTitle;
                const xsec_token = item.xsecToken;
                const url = this.site.baseUrl + `/explore/${noteId}?xsec_token=${xsec_token}`;
                const detail = new ExtensionDetail(noteId, url, title);
                detail.thumbnail = cover;
                detail.author = author;
                detail.type = MediaType.Article;
                return detail;
            });
        } catch (e) {
            console.error("Failed to parse JSON data:", e);
        }

        console.log(articles);

        const extensionList = new ExtensionList(articles, page, undefined);
        return extensionList;
    }

    async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        var htmlResponse = await this.client?.request({ url: url, method: "GET" });
        var html = htmlResponse.body;
        const jsonString = this.searchHtmlScriptElement(html);
        if (jsonString === "") {
            return new ArticleMedia(id, "内容加载失败", "无法获取笔记内容，可能是未登录或笔记不存在。");
        }

        let mediaContent = "";
        let content = "";
        try {
            const data = JSON.parse(jsonString);
            const noteDetail = data.note.noteDetailMap[id].note;
            const type = noteDetail.type;
            let desc = noteDetail.desc;
            desc = desc.replaceAll(/\[.*?\]/g, '');
            desc = desc.replaceAll(/#(.*?)#/g, '#$1');
            desc = desc.replaceAll('\n', '<br>');
            // parse timestamp to date
            const timestamp = noteDetail.time;
            const date = new Date(timestamp);
            const formattedDate = date.toLocaleDateString();
            if (type === "video") {

                const videoUrls: string[] = [];

                const streamTypes = ['h264', 'av1', 'h265', 'h266'];
                for (const type of streamTypes) {
                    const streams = noteDetail.video?.media?.stream?.[type];
                    if (streams?.length > 0) {
                        const stream = streams[0];
                        if (stream.masterUrl) {
                            videoUrls.push(stream.masterUrl);
                        }
                        if (stream.backupUrls?.length) {
                            videoUrls.push(...stream.backupUrls);
                        }
                    }
                }

                const originVideoKey = noteDetail.video?.consumer?.originVideoKey;
                if (originVideoKey) {
                    videoUrls.push(`http://sns-video-al.xhscdn.com/${originVideoKey}`);
                }

                const posterUrl = noteDetail.imageList?.[0]?.urlDefault;

                if (videoUrls.length > 0) {
                    mediaContent = `<video controls ${posterUrl ? `poster="${posterUrl}"` : ''}>
                    ${videoUrls.map((url) => `<source src="${url}" type="video/mp4">`).join('\n')}
                </video><br>`;
                }
            } else {
                mediaContent = noteDetail.imageList.map((image: any) => {
                    if (image.livePhoto) {
                        const videoUrls: string[] = [];

                        const streamTypes = ['h264', 'av1', 'h265', 'h266'];
                        for (const type of streamTypes) {
                            const streams = image.stream?.[type];
                            if (streams?.length > 0) {
                                if (streams[0].masterUrl) {
                                    videoUrls.push(streams[0].masterUrl);
                                }
                                if (streams[0].backupUrls?.length) {
                                    videoUrls.push(...streams[0].backupUrls);
                                }
                            }
                        }

                        if (videoUrls.length > 0) {
                            return `<video controls poster="${image.urlDefault}">
                            ${videoUrls.map((url) => `<source src="${url}" type="video/mp4">`).join('\n')}
                        </video>`;
                        }
                    }
                    return `<img src="${image.urlDefault}">`;
                }).join('<br>');
            }
            content = `${mediaContent}<br><p>${desc}</p>`;

            const articleMedia = new ArticleMedia(id, noteDetail.title, content);
            articleMedia.author = noteDetail.user.nickname;
            articleMedia.date = formattedDate;
            return articleMedia;
        } catch (e) {
            console.error("Failed to parse JSON data:", e);
            return new ArticleMedia(id, "内容加载失败", "无法获取笔记内容，可能是未登录或笔记不存在。");
        }
    }
}

(function () {
    const redNote = new RedNote();
    redNote.init();
})();

export default RedNote;