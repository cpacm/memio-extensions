import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia, ExtensionAuth, SiteHeader, Channel,ChannelType } from '@/core/extension';


class Web3Caff extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("web3caff", "Web3Caff", MediaType.Article);
        site.baseUrl = "https://www.web3caff.com";
        site.description = "Web3Caff - Your Daily Dose of Web3 News and Insights";
        site.thumbnail = "https://oss24.web3caff.com/wp-content/uploads/2022/01/cropped-icon-2.png";
        site.lang = "zh";
        site.categoryList = [
            new SiteUrl("推荐", "append=list-home&action=ajax_load_posts&query=&page=home"),
            new SiteUrl("叙事", "append=list-home&action=ajax_load_posts&query=&page=home&tabcid=199"),
            new SiteUrl("观点", "append=list-home&action=ajax_load_posts&query=&page=home&tabcid=195"),
            new SiteUrl("会员内容", "append=list-home&action=ajax_load_posts&query=&page=home&tabcid=1555"),
            new SiteUrl("对话", "append=list-home&action=ajax_load_posts&query=&page=home&tabcid=189"),
            new SiteUrl("资源与指南", "append=list-home&action=ajax_load_posts&query=&page=home&tabcid=197"),
            new SiteUrl("政策与法律", "append=list-home&action=ajax_load_posts&query=&page=home&tabcid=191"),
        ];
        site.loginParams = [
            { key: "cookie", value: "用户Cookie值" },
        ]
        site.channel = new Channel(ChannelType.List, "作者名称", "author");
        site.useGuide = `## 如何获取作者名称

1. 访问网站，进入想要访问的作者主页；
2. 在其网页链接上，例如 \`https://www.web3caff.com/author/author-name\` ，其中的 \`author-name\` 就是作者名称。
`;
        return site;
    }

    override async loginForm(form: Map<string, string>): Promise<ExtensionAuth> {
        const cookie = form.get("cookie") || "";
        const auth = new ExtensionAuth();
        auth.headers.push(new SiteHeader("Cookie", cookie));
        return auth;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        let api = `https://web3caff.com/wp-admin/admin-ajax.php`;
        let query = url + `&paged=${page}`;

        const htmlResponse = await this.client.request(
            {
                url: api,
                contentType: "application/x-www-form-urlencoded",
                method: "POST",
                body: query
            }
        );
        const html = htmlResponse.body;

        const $nodes = $(html);

        let itemList = $nodes.find("div.list-item");

        let list: ExtensionDetail[] = [];
        itemList.each((index, element) => {
            let el = $(element);
            let cover = el.find("div.media img").attr("data-src") || "";
            let title = el.find("div.media a").attr("title") || "";
            let link = el.find("div.media a").attr("href") || "";
            // https://web3caff.com/archives/130083
            let id = link.split("/").pop() || "";
            let author = el.find("div.list-content div.h-1x").text().trim();
            let time = el.find("div.list-content div").last().text().trim();
            let category = el.find("div.list-content div.list-featured-tag span").text().trim();

            let detail = new ExtensionDetail(id, link, title);
            detail.author = author;
            detail.thumbnail = cover;
            detail.status = time;
            detail.category = category;
            list.push(detail);
        });

        let hasMore = itemList.length >= 10;

        return new ExtensionList(list, page, hasMore ? url : undefined);

    }

    channelMaps: Map<string, string> = new Map<string, string>();

    override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        let authorId = this.channelMaps.get(key);
        if (authorId === undefined) {
            let authorPage = "https://web3caff.com/archives/author/" + key;
            const htmlResponse = await this.client.request({
                url: authorPage,
                method: "GET"
            });
            const html = htmlResponse.body;
            let bodyClass = "";
            const bodyClassMatch = html.match(/<body.*?class="([^"]*)"/);
            if (bodyClassMatch && bodyClassMatch.length > 1) {
                bodyClass = bodyClassMatch[1];
            }
            let match = bodyClass.match(/author-(\d+)/);
            if (match) {
                authorId = match[1];
                console.log("Author ID:", authorId);
                this.channelMaps.set(key, authorId);
            } else {
                console.log("Author ID not found for key:", key);
                return new ExtensionList([], page, undefined);
            }
        }

        let api = `https://web3caff.com/wp-admin/admin-ajax.php`;
        let query = `append=list-home&action=ajax_load_posts&query=${authorId}&page=author&paged=${page}`;
        const htmlResponse = await this.client.request(
            {
                url: api,
                contentType: "application/x-www-form-urlencoded",
                method: "POST",
                body: query
            }
        );
        const html = htmlResponse.body;
        const $nodes = $(html);
        let itemList = $nodes.find("div.list-item");

        let list: ExtensionDetail[] = [];
        itemList.each((index, element) => {
            let el = $(element);
            let cover = el.find("div.media img").attr("data-src") || "";
            let title = el.find("div.media a").attr("title") || "";
            let link = el.find("div.media a").attr("href") || "";
            // https://web3caff.com/archives/130083
            let id = link.split("/").pop() || "";
            let author = el.find("div.list-content div.h-1x").text().trim();
            let time = el.find("div.list-content div").last().text().trim();
            let category = el.find("div.list-content div.list-featured-tag span").text().trim();

            let detail = new ExtensionDetail(id, link, title);
            detail.author = author;
            detail.thumbnail = cover;
            detail.status = time;
            detail.category = category;
            list.push(detail);
        });

        let hasMore = itemList.length >= 10;
        return new ExtensionList(list, page, hasMore ? api : undefined);
    }


    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        const htmlResponse = await this.client.request(
            {
                url: url,
                method: "GET"
            }
        );
        const html = htmlResponse.body;
        let $nodes = $(html);
        let content = $nodes.find("div.post");

        let coverStyle = content.find("div.post-poster div.media-content").attr("style") || "";
        // get cover from background-image:url('https://oss24.web3caff.com/wp-content/uploads/2024/12/image_2022_8_20_490-1.jpg')
        const match = coverStyle.match(/url\(['"]?(.*?)['"]?\)/);
        let cover = match ? match[1] : "";

        let coverNode = "<img src='" + cover + "' />";
        let title = content.find("h1.post-title").text().trim();
        let author = content.find("div.author-name a.author-popup").text().trim();
        let time = content.find("div.author-name time").text().trim();

        let article = content.find("div.post-content");
        article.find("div.addtoany_content").remove();
        article.find("noscript").remove();
        article.find("img").each((index, element) => {
            let el = $(element);
            let dataSrc = el.attr("data-src");
            if (dataSrc) {
                el.attr("src", dataSrc);
            }
        });

        let contentHtml = "<html>" + coverNode + (article.html() || "") + "</html>";

        let media = new ArticleMedia(id, title, contentHtml);
        media.author = author;
        media.date = time;

        return media;
    }

}

// append=list-home&paged=2&action=ajax_load_posts&query=&page=home

(function () {
    let web3caff = new Web3Caff();
    web3caff.init();
})();

export default Web3Caff;