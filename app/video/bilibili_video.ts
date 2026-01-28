import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ExtensionAuth, SiteHeader, VideoMedia, Channel, ChannelType } from '@/core/extension';

class BilibiliVideo extends Rule {

    bvidTime = 1_589_990_400;

    provideExtensionInfo(): Extension {
        let site = new Extension("bilibili_video", "哔哩哔哩", MediaType.Video);
        site.baseUrl = "https://www.bilibili.com";
        site.description = "哔哩哔哩-中国的年轻人文化社区。";
        site.thumbnail = "https://www.bilibili.com/favicon.ico";
        site.lang = "zh";
        site.categoryList = [
            new SiteUrl("热门视频", "https://api.bilibili.com/x/web-interface/popular?pn={page}&ps=20"), // pn为页码，从1开始，ps为每页数量，默认20
            new SiteUrl("排行榜", "https://api.bilibili.com/x/web-interface/ranking/v2"), //   rid=0 全站
            new SiteUrl("排行榜-动画", "https://api.bilibili.com/x/web-interface/ranking/v2?tid=1"),
            new SiteUrl("排行榜-音乐", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=3"),
            new SiteUrl("排行榜-舞蹈", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=129"),
            new SiteUrl("排行榜-游戏", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=4"),
            new SiteUrl("排行榜-知识", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=36"),
            new SiteUrl("排行榜-科技", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=188"),
            new SiteUrl("排行榜-运动", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=234"),
            new SiteUrl("排行榜-生活", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=160"),
            new SiteUrl("排行榜-汽车", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=223"),
            new SiteUrl("排行榜-美食", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=211"),
            new SiteUrl("排行榜-动物圈", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=217"),
            new SiteUrl("排行榜-鬼畜", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=119"),
            new SiteUrl("排行榜-时尚", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=155"),
            new SiteUrl("排行榜-娱乐", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=5"),
            new SiteUrl("排行榜-影视", "https://api.bilibili.com/x/web-interface/ranking/v2?rid=181"),
        ];
        site.channel = new Channel(ChannelType.List, "UP主ID", "userId");

        site.forceLogin = false;
        site.loginParams = [
            { key: "Cookie", value: "Cookie值(取 SESSDATA 值)" },
        ];

        site.useGuide =
            `## 如何获取 Bilibili Cookie？

1. 打开浏览器，登录你的 Bilibili 账号。
2. 进入开发者工具（通常可以通过按 F12 或右键点击页面选择“检查”来打开）。
3. 在开发者工具中，找到“应用程序”或“存储”选项卡。
4. 在左侧菜单中，选择“Cookies”，然后选择“https://www.bilibili.com”。
5. 找到名为“SESSDATA”的 Cookie 值。
6. 将该值复制并粘贴到扩展的登录表单中对应的字段，输入格式为 SESSDATA=xxx; 。

> 注意：请确保妥善保管你的 Cookie 信息，避免泄露给他人以保护你的账号安全。
            
## 如何获取用户ID？

1. 打开浏览器，访问 Bilibili 网站。
2. 访问要查看的用户个人空间，URL 格式通常为：https://space.bilibili.com/{用户ID}。
3. 从 URL 中提取数字部分，这就是该用户的用户ID。例如，在 https://space.bilibili.com/3546857466759197 中，用户ID 是 3546857466759197。
4. 将该用户ID 输入到扩展的频道字段中。
            `;
        return site;
    }

    override async loginForm(form: Map<string, string>): Promise<ExtensionAuth> {
        const cookie = form.get("Cookie") || "";
        const auth = new ExtensionAuth();
        auth.headers.push(new SiteHeader("Cookie", cookie));
        return auth;
    }

    parseVideoListJson(items: any): ExtensionDetail[] {
        var videos: ExtensionDetail[] = [];
        videos = items.map((video: any) => {
            const cover = video.pic ?? video.first_frame;
            const author = video.owner.name;
            const category = video.tname;
            const title = video.title;
            const desc = video.desc;

            const timestamp = video.pubdate;
            const date = new Date(timestamp * 1000);
            const formattedDate = date.toLocaleDateString();
            const link = video.pubdate > this.bvidTime && video.bvid ? `https://www.bilibili.com/video/${video.bvid}` : `https://www.bilibili.com/video/av${video.aid}`;
            const id = video.cid;
            const detail = new ExtensionDetail(id, link, title);
            detail.thumbnail = cover;
            detail.author = author;
            detail.status = category;
            detail.category = formattedDate;
            detail.description = desc;
            detail.type = MediaType.Video;
            return detail;
        });
        return videos;
    }

    calculateDateNum(): number {
        const referenceTimestamp = 1761904800000; // 毫秒
        const referenceIssueNumber = 345;

        // 2. 获取当前时间戳 (毫秒)
        const currentTimestamp = Date.now();

        // 3. 计算时间差（毫秒）
        const timeDifference = currentTimestamp - referenceTimestamp;

        // 4. 计算过去了多少个7天周期 (1000ms * 60s * 60min * 24h * 7d)
        const weeksPassed = Math.floor(timeDifference / 604800000);

        // 5. 计算当前期数
        const currentIssueNumber = referenceIssueNumber + weeksPassed;
        return currentIssueNumber;
    }

    async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let currentUrl = url;
        let hasMore = false;

        if (url.includes("ranking")) {
            currentUrl = url;
        } else {
            currentUrl = url.replace("{page}", page.toString());
        }

        console.log("Requesting URL:", currentUrl);

        var htmlResponse = await this.client?.request({
            url: currentUrl, method: "GET"
        });
        var html = htmlResponse.body;

        var videos: ExtensionDetail[] = [];

        console.log("Response HTML:", html);

        try {
            const data = JSON.parse(html);
            if (data.code !== 0) {
                console.error("API returned error code:", data.code, "message:", data.message);
                return new ExtensionList(videos, page, undefined);
            }
            const items = data.data.list;
            if (data.data.no_more !== undefined) {
                hasMore = data.data.no_more === false;
            }

            videos = this.parseVideoListJson(items);
        } catch (e) {
            console.error("Failed to parse JSON data:", e);
        }

        let nextUrl = hasMore ? url.replace("{page}", (page + 1).toString()) : undefined;
        const extensionList = new ExtensionList(videos, page, nextUrl);
        return extensionList;
    }

    async requestChannelList(userId: string, page: number): Promise<ExtensionList> {

        var realUrl = `https://api.bilibili.com/x/series/recArchivesByKeywords?mid=${userId}&keywords=&pn=${page}&ps=20`;
        var htmlResponse = await this.client?.request({ url: realUrl, method: "GET" });
        var html = htmlResponse.body;

        var hasMore = false;
        var videos: ExtensionDetail[] = [];

        try {
            const data = JSON.parse(html);

            if (data.code !== 0) {
                console.error("Failed to fetch channel list:", data.message);
                return new ExtensionList([], page, undefined);
            }
            let total = data.data.page.total;
            hasMore = page * 20 < total;

            const items = data.data.archives;

            videos = items.map((video: any) => {
                const cover = video.pic ?? video.first_frame;
                const title = video.title;

                const timestamp = video.ctime;
                const date = new Date(timestamp * 1000);
                const formattedDate = date.toLocaleDateString();
                const link = `https://www.bilibili.com/video/${video.bvid}`;
                const id = video.bvid;
                const detail = new ExtensionDetail(id, link, title);
                detail.thumbnail = cover;
                detail.category = formattedDate;
                detail.type = MediaType.Video;
                return detail;
            });

            // update offset for next page from articles last item
        } catch (e) {
            console.error("Failed to parse JSON data:", e);
        }

        if (!hasMore) {
            return new ExtensionList(videos, page, undefined);
        }
        return new ExtensionList(videos, page, realUrl);
    }

    async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        let newPlayerUrl = 'https://www.bilibili.com/blackboard/newplayer.html?isOutside=true&autoplay=true&danmaku=true&muted=false&highQuality=true'
        let isBvid = url.includes("/video/BV");
        if (isBvid) {
            let bvid = url.substring(url.lastIndexOf("BV"));
            let fullUrl = `${newPlayerUrl}&bvid=${bvid}&cid=${id}`;
            return new VideoMedia(id, "", fullUrl, false, true);
        } else {
            let avid = url.substring(url.lastIndexOf("av"));
            let fullUrl = `${newPlayerUrl}&aid=${avid}&cid=${id}`;
            return new VideoMedia(id, "", fullUrl, false, true);
        }
    }
}


(function () {
    const video = new BilibiliVideo();
    video.init();
})();

export default BilibiliVideo;