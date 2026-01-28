import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, MediaType, ArticleMedia, ExtensionAuth, ChannelType,Channel } from '@/core/extension';
import { formatDateToYMD } from '@/utils/date';

class Zhihu extends Rule {

    provideExtensionInfo(): Extension {

        let site = new Extension("zhihu_zhuanlan", "知乎-专栏", MediaType.Article)
        site.baseUrl = "https://www.zhihu.com"
        site.thumbnail = "https://static.zhihu.com/heifetz/favicon.ico"
        site.description = "知乎，是一个真实的网络问答社区，在这里你可以提出问题，分享知识、经验和见解。"
        site.lang = "zh"
        site.imageRefer = "https://www.zhihu.com/"
        site.categoryList = [
            { name: "专栏推荐", url: `/api/v4/column/recommend/web` },
        ]

        site.channel = new Channel(ChannelType.List, "专栏链接", "zhuanlan");

        site.loginParams = [
            { key: "Cookie", value: "知乎账号 Cookie" },
        ]
        site.forceLogin = true;
        site.useGuide = `## 获取知乎 Cookie 指南

1. 打开浏览器，登录你的知乎账号。
2. 进入开发者工具（通常可以通过按 F12 或右键点击页面选择“检查”来打开）。
3. 在开发者工具中，找到“应用程序”或“存储”选项卡。
4. 在左侧菜单中，找到“Cookies”，然后选择“https://www.zhihu.com”。
5. 在右侧的 Cookie 列表中，找到名为“z_c0”、“__zse_ck” 等关键 Cookie。
6. 将这些 Cookie 的名称和值复制下来，按照“名称=值; 名称=值; ...”的格式拼接成一个字符串。
7. 将拼接好的 Cookie 字符串粘贴到扩展的登录参数中。

## 如何获取专栏链接

1. 打开知乎网站，浏览到你感兴趣的专栏页面。
2. 复制浏览器地址栏中的 URL 链接，如 https://zhuanlan.zhihu.com/yixinli, 取 “yixinli”。
3. 将该链接粘贴到扩展的频道参数中即可。
`;

        return site;
    }

    override async loginForm(form: Map<string, string>): Promise<ExtensionAuth> {
        let cookie = form.get("Cookie") || "";
        let auth = new ExtensionAuth();
        auth.headers.push({ key: "Cookie", value: cookie });
        return auth;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {

        let offset = (page - 1) * 30;
        let params = `limit=30&offset=${offset}`;
        let apiUrl = `${this.site.baseUrl}${url}?${params}`;
        let nextUrl = `${this.site.baseUrl}${url}?limit=30&offset=${offset + 30}`;
        let response = await this.client?.request(
            {
                url: apiUrl,
                method: "GET",
                contentType: "application/json",
                headers: [
                    { key: 'Referer', value: this.site.baseUrl },
                    { key: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' }
                ],
            }
        );

        let json = JSON.parse(response.body);
        let data = json.data;

        let detailList: ExtensionDetail[] = [];

        data.forEach((item: any) => {
            let contentInfo = item.content_info;
            if (!contentInfo) {
                return;
            }
            let title = contentInfo.content_title;
            let url = contentInfo.content_url;
            let id = url.split("/").pop() || "";

            let desc = contentInfo.summary;
            let images = contentInfo.media_detail.images;
            let image = images && images.length > 0 ? images[0] : undefined;
            let thumbnail = image ? image.url : undefined;

            let author = item.author.name;

            let detail = new ExtensionDetail(id, url, title);
            detail.thumbnail = thumbnail;
            detail.description = desc;
            detail.author = author;
            detail.category = item.title;
            detail.type = MediaType.Article;

            detailList.push(detail);
        });

        let paging = json.paging;
        let hasMore = paging.is_end === false;

        return new ExtensionList(detailList, page, hasMore ? nextUrl : undefined);
    }

    override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        let offset = (page - 1) * 10;
        let params = `limit=10&offset=${offset}`;
        let apiUrl = `${this.site.baseUrl}/api/v4/columns/${key}/items?${params}`;
        let nextUrl = `${this.site.baseUrl}/api/v4/columns/${key}/items?limit=10&offset=${offset + 10}`;

        let response = await this.client?.request(
            {
                url: apiUrl,
                method: "GET",
                contentType: "application/json",
                headers: [
                    { key: 'Referer', value: this.site.baseUrl },
                    { key: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' }
                ],
            }
        );

        let json = JSON.parse(response.body);
        let data = json.data;

        console.log(data);

        let detailList: ExtensionDetail[] = [];

        data.forEach((item: any) => {
            let id = item.id;
            let title = item.title;
            let url = item.url;
            let desc = item.excerpt;
            let thumbnail = item.image_url;
            let author = item.author.name;

            let detail = new ExtensionDetail(id, url, title);
            detail.thumbnail = thumbnail;
            detail.description = desc;
            detail.author = author;
            detail.type = MediaType.Article;

            detailList.push(detail);
        });

        let paging = json.paging;
        let hasMore = paging.is_end === false;

        return new ExtensionList(detailList, page, hasMore ? nextUrl : undefined);
    }

    searchHtmlScriptElement(html: string): string {
        let $nodes = $(html);
        let jsonString = "";
        $nodes.each((index, element) => {
            if (element instanceof HTMLScriptElement) {
                if (element.id === "js-initialData") {
                    jsonString = element.innerHTML.replace(/undefined/g, "null");
                    return false; // Exit the each loop
                }
            }
        });
        return jsonString;
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {

        let response = await this.client?.request({ url: url, method: "GET" });
        let jsonString = this.searchHtmlScriptElement(response.body);
        const json = JSON.parse(jsonString);

        let article = json.initialState.entities.articles[id];
        let title = article.title;
        let thumbnail = article.imageUrl;
        let author = article.author.name;
        let content = article.content;
        let fullContent = content;
        if (thumbnail && thumbnail.startsWith("http")) {
            fullContent = `<img src="${thumbnail}" /><br/>` + content;
        } else {
            fullContent = content;
        }
        let articleMedia = new ArticleMedia(id, title, `<html>${fullContent}</html>`);
        articleMedia.author = author;
        articleMedia.date = formatDateToYMD(new Date(article.created * 1000).toISOString());

        return articleMedia;
    }

}


(function () {
    let rule = new Zhihu();
    rule.init();
})();

export default Zhihu;