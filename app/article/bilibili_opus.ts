import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, ArticleMedia, ExtensionAuth, SiteHeader, ChannelType, Channel } from '@/core/extension';

class BilibiliOpus extends Rule {

    // cache page with offset 
    channelPageOffsetMap: Map<number, string> = new Map<number, string>();

    provideExtensionInfo(): Extension {
        let site = new Extension("bilibili_opus", "哔哩哔哩-专栏", MediaType.Article);
        site.baseUrl = "https://www.bilibili.com";
        site.description = "哔哩哔哩-中国的年轻人文化社区";
        site.thumbnail = "https://www.bilibili.com/favicon.ico";
        site.lang = "zh";
        site.categoryList = [
            new SiteUrl("推荐", site.baseUrl + "/read/home/"),
        ];
        site.channel = new Channel(ChannelType.List, "用户ID", "userId");

        site.forceLogin = false;
        site.loginParams = [
            { key: "Cookie", value: "用户Cookie值(取 DedeUserID 和 DedeUserID__ckMd5 值)" },
        ];

        site.useGuide = `## 如何获取 Bilibili Cookie？

1. 打开浏览器，登录你的 Bilibili 账号。
2. 进入开发者工具（通常可以通过按 F12 或右键点击页面选择“检查”来打开）。
3. 在开发者工具中，找到“应用程序”或“存储”选项卡。
4. 在左侧菜单中，选择“Cookies”，然后选择“https://www.bilibili.com”。
5. 找到名为“DedeUserID”和“DedeUserID__ckMd5”的 Cookie 值。
6. 将这两个值复制并粘贴到扩展的登录表单中对应的字段，输入格式为 DedeUserID=xxx; DedeUserID__ckMd5=xxx; 。

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

    searchHtmlScriptElement(html: string): string {
        let $nodes = $(html);
        let jsonString = "";
        $nodes.each((index, element) => {
            if (element instanceof HTMLScriptElement) {
                let scriptContent = element.innerHTML;
                if (scriptContent.includes("window.__INITIAL_STATE__")) {
                    jsonString = scriptContent.replace('window.__INITIAL_STATE__=', '').replace(/undefined/g, "null");
                    if (jsonString.includes("(function(){")) {
                        // remove the function wrapper
                        const funcStart = jsonString.lastIndexOf(";(function(){");
                        if (funcStart !== -1) {
                            jsonString = jsonString.substring(0, funcStart);
                        }
                    }
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
            const items = data.home.list;

            articles = items.map((note: any) => {
                const noteId = note.id.toString();
                var banner = note.banner_url;
                if (!banner || banner === "") {
                    banner = note.image_urls[0];
                }
                const cover = decodeURIComponent(banner);
                const author = note.author.name;
                //const category = note.category.name;
                const title = note.title;

                const timestamp = note.publish_time;
                const date = new Date(timestamp * 1000);
                const formattedDate = date.toLocaleDateString();

                const url = this.site.baseUrl + `/read/cv${noteId}`;
                const detail = new ExtensionDetail(noteId, url, title);
                detail.thumbnail = cover;
                detail.author = author;
                detail.category = formattedDate;
                detail.type = MediaType.Article;
                return detail;
            });
        } catch (e) {
            console.error("Failed to parse JSON data:", e);
        }

        const extensionList = new ExtensionList(articles, page, undefined);
        return extensionList;
    }

    // https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/opus/space.md
    async requestChannelList(userId: string, page: number): Promise<ExtensionList> {

        // get offset from map
        const offset = this.channelPageOffsetMap.get(page) || "";
        console.log("requestChannelList page:", page, " offset:", offset);

        var realUrl = `https://api.bilibili.com/x/polymer/web-dynamic/v1/opus/feed/space?host_mid=${userId}&page=${page}&type=all&offset=${offset}`;
        var htmlResponse = await this.client?.request({ url: realUrl, method: "GET" });
        var html = htmlResponse.body;

        var articles: ExtensionDetail[] = [];
        var hasMore = false;

        try {
            const data = JSON.parse(html);

            if (data.code !== 0) {
                console.error("Failed to fetch channel list:", data.message);
                return new ExtensionList([], page, undefined);
            }
            hasMore = data.data.has_more;

            const items = data.data.items;
            articles = items.map((note: any) => {
                const noteId = note.opus_id;
                // judge note.cover exist?
                const cover = note.cover?.url ? note.cover.url : "";
                const title = note.content;

                const url = "https:" + note.jump_url;
                const detail = new ExtensionDetail(noteId, url, title);
                detail.thumbnail = cover;
                detail.type = MediaType.Article;

                return detail;
            });

            // update offset for next page from articles last item
            const nextOffset = articles.length > 0 ? articles[articles.length - 1].id : "";
            console.log("nextOffset:", nextOffset);
            this.channelPageOffsetMap.set(page + 1, nextOffset);
        } catch (e) {
            console.error("Failed to parse JSON data:", e);
        }

        if (!hasMore) {
            return new ExtensionList(articles, page, undefined);
        }
        return new ExtensionList(articles, page, realUrl);
    }

    async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        var htmlResponse = await this.client?.request({
            url: url, method: "GET"
        });
        var html = htmlResponse.body;
        const jsonString = this.searchHtmlScriptElement(html);
        if (!jsonString || jsonString === "") {
            return new ArticleMedia(id, "", "<html></html><body>内容加载失败</body></html>");
        }

        try {
            let json = JSON.parse(jsonString);
            let moduleList = json.detail.modules;
            // find author module and content module or undefined
            let titleModule = moduleList.find((module: any) => module.module_title);
            let authorModule = moduleList.find((module: any) => module.module_author);
            let contentModule = moduleList.find((module: any) => module.module_content);
            let title = titleModule?.module_title?.text;
            let author = authorModule?.module_author?.name;
            let paragraphList = contentModule?.module_content?.paragraphs;

            if (paragraphList) {
                let contentMarkdown = this.parseOpusNodes(paragraphList);
                if (title === undefined || title === null) {
                    title = "无标题专栏";
                }
                let articleMedia = new ArticleMedia(id, title, contentMarkdown);
                articleMedia.author = author;
                articleMedia.isMarkdown = true;
                return articleMedia;
            }
        } catch (e) {
            console.error("Failed to parse JSON data:", e);
        }

        return new ArticleMedia(id, "", "<html></html><body>内容加载失败</body></html>");

        // let title = $nodes.find("div.opus-detail div.opus-module-title__inner").text().trim();
        // let author = $nodes.find("div.opus-detail div.opus-module-author__name").text().trim();
        // let date = $nodes.find("div.opus-detail div.opus-module-author__pub").text().replace("编辑于", "").trim();
        // let findedContent = $nodes.find("div.opus-module-content").first();
        // findedContent.find("div.bili-album__watch__control").remove(); // remove image control divs
        // let content = "<html>" + findedContent.html() + "</html>";
    }


    // parse article opus nodes tp html
    // https://github.com/SocialSisterYi/bilibili-API-collect/blob/master/docs/opus/features.md
    private parseOpusNodes(paragraphs: any[]): string {
        let markdown = "";
        paragraphs.forEach(paragraph => {
            const para_type = paragraph.para_type;
            switch (para_type) {
                case 1: // TEXT
                    const text_nodes = paragraph.text.nodes;
                    let line = "";
                    text_nodes.forEach((node: any) => {
                        line += this.parseOpusTextNode(node);
                    });

                    markdown += `${line}\n\n`;

                    break;
                case 2: // IMAGE
                    const pics = paragraph.pic.pics;
                    pics.forEach((pic: any) => {
                        markdown += `![](${pic.url})\n\n`;
                    });
                    break;
                case 3: // DIVIDER
                    markdown += "---\n\n";
                    break;
                case 4: // QUOTE
                    const quotes = paragraph.blockquote.children;
                    quotes.forEach((children: any) => {
                        let quote_nodes = children.text.nodes;
                        let quote = "";
                        quote_nodes.forEach((node: any) => {
                            quote += this.parseOpusTextNode(node);
                        });
                        markdown += `> ${quote}\n\n`;
                    });
                    break;
                case 5: // LIST
                    const list = paragraph.list;
                    const list_items = list.children;
                    list_items.forEach((item: any) => {
                        // 列表项可能是嵌套的段落
                        const nestedParagraphs = item.children;
                        if (nestedParagraphs && nestedParagraphs.length > 0) {
                            // 递归解析嵌套的段落
                            const nestedContent = this.parseOpusNodes(nestedParagraphs).trim();
                            const indent = ' '.repeat((item.level - 1) * 4);
                            if (list.style === 1) { // ordered
                                markdown += `${indent}${item.order}. ${nestedContent}\n`;
                            } else { // unordered
                                markdown += `${indent}* ${nestedContent}\n`;
                            }
                        }
                    });
                    markdown += "\n";
                    break;
                case 6: // LINK_CARD
                    const card = paragraph.link_card.card;
                    const cardType = card.type;
                    switch (cardType) {
                        case "LINK_CARD_TYPE_UGC":
                            let ugc = card.ugc;
                            let ugcTitle = ugc?.title || "链接";
                            let ugcCover = decodeURIComponent(ugc?.cover || "");
                            let ugcUrl = decodeURIComponent(ugc.jump_url || "");
                            if (ugcUrl.startsWith("//")) {
                                ugcUrl = "https:" + ugcUrl;
                            }
                            markdown += `!!I\n![cover](${ugcCover})\n[${ugcTitle}](${ugcUrl})\n\n!!!\n`;
                            break;
                        case "LINK_CARD_TYPE_OPUS":
                            let opus = card.opus;
                            let opusTitle = opus?.title || "专栏链接";
                            let opusCover = decodeURIComponent(opus?.cover || "");
                            let opusUrl = decodeURIComponent(opus.jump_url || "");
                            if (opusUrl.startsWith("//")) {
                                opusUrl = "https:" + opusUrl;
                            }
                            markdown += `!!I\n![cover](${opusCover})\n[${opusTitle}](${opusUrl})\n\n!!!\n`;
                            break;

                        case "LINK_CARD_TYPE_COMMON":
                            let common = card.common;
                            markdown += `[${common.title}](${decodeURIComponent(common.jump_url)})\n\n`;
                            break;
                        case "LINK_CARD_TYPE_RESERVE":
                            let reserve = card.reserve;
                            markdown += `[${reserve.title}](${decodeURIComponent(reserve.jump_url)})\n\n`;
                            break;

                        case "LINK_CARD_TYPE_GOODS":
                            let goods = card.goods;
                            let goodsTitle = goods?.head_text || "商品链接";
                            let goodsUrl = decodeURIComponent(goods.jump_url || "");
                            if (goodsUrl.startsWith("//")) {
                                goodsUrl = "https:" + goodsUrl;
                            }
                            markdown += `[${goodsTitle}](${goodsUrl})\n\n`;
                            break;

                        case "LINK_CARD_TYPE_MUSIC":
                            let music = card.music;
                            let musicTitle = music?.title || "音乐链接";
                            let musicUrl = decodeURIComponent(music.jump_url || "");
                            if (musicUrl.startsWith("//")) {
                                musicUrl = "https:" + musicUrl;
                            }
                            markdown += `[${musicTitle}](${musicUrl})\n\n`;
                            break;
                        case "LINK_CARD_TYPE_LIVE":
                            let live = card.live;
                            let liveTitle = live?.title || "直播链接";
                            let liveUrl = decodeURIComponent(live.jump_url || "");
                            if (liveUrl.startsWith("//")) {
                                liveUrl = "https:" + liveUrl;
                            }
                            markdown += `[${liveTitle}](${liveUrl})\n\n`;
                            break;

                        default:
                            // 未知或默认处理
                            break;
                    }
                    break;
                case 7: // CODE
                    const code = paragraph.code;
                    markdown += "```" + `${code.lang}\n${code.content}\n` + "```\n\n";
                    break;
                case 8: // HEAD
                    const head = paragraph.heading;
                    const head_nodes = head.nodes;
                    let headLine = "";
                    head_nodes.forEach((node: any) => {
                        headLine += this.parseOpusTextNode(node);
                    });

                    markdown += `${headLine}\n\n`;
            }
        });
        return markdown;
    }


    private parseOpusTextNode(node: any): string {
        let text = "";
        const type = node.type;
        switch (type) {
            case "TEXT_NODE_TYPE_WORD":
                let content = node.word.words;

                if (node.word.style?.bold) {
                    content = `**${content}**`;
                }
                if (node.word.style?.italic) {
                    content = `*${content}*`;
                }
                if (node.word.style?.strikethrough) {
                    content = `~~${content}~~`;
                }

                const fontSize = node.word.font_size;
                if (fontSize > 30) {
                    content = `# ${content}`;
                } else if (fontSize >= 25) {
                    content = `## ${content}`;
                } else if (fontSize >= 21) {
                    content = `### ${content}`;
                }

                text += content;
                break;
            case "TEXT_NODE_TYPE_RICH":
                const rich = node.rich;
                const richType = rich.type;
                switch (richType) {
                    case "RICH_TEXT_NODE_TYPE_EMOJI":
                        // 表情，解析为图片
                        text += `![${rich.text}](${rich.emoji.icon_url})`;
                        break;
                    default:
                        // 未知或默认处理
                        let richUrl = rich.jump_url;
                        if (richUrl) {
                            if (richUrl.startsWith("//")) {
                                richUrl = "https:" + richUrl;
                            }
                            text += `[${rich.text}](${richUrl})`;
                        } else {
                            text += rich.text;
                        }
                        break;
                }
                break;
            case "TEXT_NODE_TYPE_FORMULA":
                text += `$${node.formula.latex_content}$`;
                break;
        }
        return text;
    }
}



(function () {
    const opus = new BilibiliOpus();
    opus.init();
})();

export default BilibiliOpus;