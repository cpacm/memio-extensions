import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, ItemChapter, MediaType, VideoMedia, ItemVolume, ChannelType, Channel } from '@/core/extension';

class ZyShow extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("zyshow", "综艺秀", MediaType.Video);
        site.baseUrl = "https://www.zyshow.co";
        site.description = "综艺秀旨在为台湾综艺爱好者提供及时全面的节目主题和来宾信息，各个节目的内容和观点不代表本站立场"
        site.thumbnail = "https://www.zyshow.co/images/favicon.ico";
        site.lang = "zh-TW";
        site.categoryList = [
            new SiteUrl("台湾", site.baseUrl + "/index/{page}.html"),
            new SiteUrl("大陆", site.baseUrl + "/dl/index/{page}.html"),
        ];
        site.channel = new Channel(ChannelType.List, "综艺节目Id", "name");
        site.useGuide = `## 如何获取综艺Id

1. 访问综艺秀网站 [${site.baseUrl}](${site.baseUrl})
2. 浏览或搜索您感兴趣的综艺节目
3. 点击进入该节目的详情页面
4. 在浏览器地址栏中，您会看到类似于 \`${site.baseUrl}/shishangwanjia/\` 的URL
5. 复制该URL中的 \`shishangwanjia\` 部分，即为该节目的ID;
6. 如果是大陆综艺，则URL类似于 \`${site.baseUrl}/dl/zongyijiemu/\`，ID则是 \`dl/zongyijiemu\`;
`
        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        const dlInsert = url.includes("/dl/") ? "dl/" : "";
        var realUrl = url.replace("{page}", page.toString());
        var nextUrl = url.replace("{page}", (page + 1).toString());
        var httpResponse = await this.client?.request({
            url: realUrl,
            method: "GET",
        });
        const html = httpResponse.body;
        let $nodes = $(html);

        let tableTrs = $nodes.find("table tr");

        if (!tableTrs || tableTrs.length == 0) {
            return new ExtensionList([], page ? page : 1, undefined);
        }

        var items: ExtensionDetail[] = [];
        tableTrs.each((_index, element) => {

            if (element.firstElementChild?.tagName.toLowerCase() === "th") {
                return; // skip header row
            }

            if (!element.hasAttribute("onmouseover")) {
                return; // skip non-data row
            }

            let ele = $(element);
            let tds = ele.find("td");

            // ../../wozuida/  ->  wozuida
            let date = tds.eq(0).find("a").text().trim();
            let link = tds.eq(0).find("a").attr("href")?.replace(/\.\.\//g, "");
            let idPrefix = tds.eq(1).find("a").attr("href")?.replace(/\.\.\//g, "").replace(/\//g, "");
            let id = idPrefix + "_" + date;

            let title = tds.eq(1).find("a").text().trim();
            let description = tds.eq(2).text().trim();
            let author = tds.eq(3).text().trim();
            let update = tds.eq(0).text().trim();

            let item = new ExtensionDetail(id!, this.site.baseUrl + "/" + dlInsert + link, title);
            item.description = description;
            item.author = author;
            item.category = update;
            item.hasChapter = false;
            item.type = MediaType.Video;
            items.push(item);
        });

        let maxPage = 20;
        let disableNext = page >= maxPage || items.length < 50;
        return new ExtensionList(items, page, disableNext ? undefined : nextUrl);
    }

    override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        const dlInsert = key.startsWith("dl/") ? "dl/" : "";
        let requestUrl = `${this.site.baseUrl}/${key}/${page}.html`;
        var httpResponse = await this.client?.request({
            url: requestUrl,
            method: "GET",
        });
        const html = httpResponse.body;
        let $nodes = $(html);

        let detailNode = $nodes.find("figure#event_grid")
        let cover = detailNode.find("div.inner_lyr > img").attr("src") || "";
        // ../img/nvshenjianglin.jpg -> https://www.zyshow.co/img/nvshenjianglin.jpg
        if (cover.startsWith("../")) {
            cover = this.site.baseUrl + cover.replace("../", "/");
        }

        var items: ExtensionDetail[] = [];

        let chapterNodes = $nodes.find("figure#event_detail table tr");
        chapterNodes.each((_idx, element) => {
            if (element.firstElementChild?.tagName.toLowerCase() === "th") {
                return; // skip header row
            }

            if (!element.hasAttribute("onmouseover")) {
                return; // skip non-data row
            }

            let ele = $(element);
            let tds = ele.find("td");

            // ../nvshenjianglin/v/20211117.html ->  /nvshenjianglin/v/20211117.html
            let link = tds.eq(0).find("a").attr("href") || "";
            let id = link?.replace(".html", "").replace("/v/", "_").replace(/\.\.\//g, "");;
            link = this.site.baseUrl + "/" + dlInsert + link.replace(/\.\.\//g, "");


            let title = tds.eq(0).find("a").text().trim();
            let chapterTitle = tds.eq(1).text().trim();
            let author = tds.eq(2).text().trim();

            let chapter = new ExtensionDetail(id, link, title);
            chapter.description = chapterTitle;
            // chapter.thumbnail = cover;
            chapter.author = author;
            chapter.hasChapter = false;
            chapter.type = MediaType.Video;
            items.push(chapter);
        });

        let pageInfo = $nodes.find("div.pagination form ul a").last().attr("href") || "";
        // 6.html -> 6
        let pageIndex = 0;
        try {
            pageIndex = parseInt(pageInfo.replace(".html", ""));
        } catch {
            pageIndex = 0;
        }

        let hasMore = true;
        if (pageIndex <= page || items.length < 30) {
            hasMore = false;
        }

        return new ExtensionList(items, page, hasMore ? `${this.site.baseUrl}/${key}/${page + 1}.html` : undefined);
    }


    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        var httpResponse = await this.client?.request({
            url: url,
            method: "GET",
        });
        const html = httpResponse.body;
        let $nodes = $(html);

        let playList = $nodes.find("div.js_videoCon");
        let script = playList.find("script").first().html() || "";
        let finalUrl = "";
        let title = $nodes.find("section#event_listing h3").text().trim();

        if (script.length > 0) {
            const regex = /'([^']+)'\.split\('\|'\)/;
            const match = script.match(regex);
            if (match && match[1]) {
                const parts = match[1].split('|');
                const urlPart = parts.find(p => p.length > 50); // Find the long base64-like string
                if (urlPart) {
                    // Now you have the extracted string: Zms5OXIyTmIxVkk2...
                    // You can proceed to decode it or use it as needed.
                    // For example, let's assume it's a URL parameter for another request.
                    finalUrl = `https://www.zyshow.co/url=${urlPart}`;
                    // TODO: Make a request to finalUrl or process it.

                    // This is a placeholder for the final media URL.
                    // You will likely need to make another request and parse the result.
                }
            }
        }

        if (finalUrl.length == 0) {
            // Fallback: try to find video source directly in HTML
            finalUrl = $nodes.find("a").attr("href") || "";
        }

        if (finalUrl.length == 0) {
            console.error("No media URL found");
            return new VideoMedia("-1", "", "");
        }

        // request m3u8
        var mediaResponse = await this.client?.request({
            url: finalUrl,
            method: "GET",
        });

        let mediaBody = mediaResponse.body;

        console.log("Extracted media: " + mediaBody);
        let m3u8Url = "";
        const regex = /var urls = "([^"]+)"/;
        const match = mediaBody.match(regex);
        if (match && match[1]) {
            m3u8Url = match[1];
        }

        if (m3u8Url.length > 0) {
            return new VideoMedia(id, title, m3u8Url, false, false);
        }

        return new VideoMedia(id, title, finalUrl, false, true);
    }

}

(function () {
    const zyshow = new ZyShow();
    zyshow.init();
})();

export default ZyShow;