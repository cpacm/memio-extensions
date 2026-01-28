import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, MediaType, ArticleMedia, Channel, ChannelType } from '@/core/extension';
import { getCurrentMonth, getCurrentYear } from '@/utils/date';

class Bahamut extends Rule {
    override provideExtensionInfo(): Extension {
        let site = new Extension("bahamut", "巴哈姆特電玩資訊站", MediaType.Article);
        site.baseUrl = "https://www.gamer.com.tw";
        site.description = "巴哈姆特電玩資訊站為台灣最大遊戲網站，提供最新遊戲新聞、專題報導、電玩展資訊、遊戲攻略、玩家心得、電玩直播等豐富內容。";
        site.thumbnail = "https://gnn.gamer.com.tw/favicon.ico";
        site.lang = "zh-TW";
        site.categoryList = [
            { name: "GNN新聞", url: "k=2" },
            { name: "手機", url: "k=4" },
            { name: "PC", url: "k=1" },
            { name: "TV", url: "k=3" },
            { name: "動漫畫", url: "k=5" },
            { name: "新訊", url: "k=14" },
            { name: "宅物", url: "k=15" },
            { name: "活動", url: "k=16" }
        ];

        site.channel = new Channel(ChannelType.List, "哈啦区(bsn)", "bsn");
        site.useGuide = `## 如何获取频道ID
1. 访问巴哈姆特电玩资讯站的哈啦区页面：[https://forum.gamer.com.tw/](https://forum.gamer.com.tw/)
2. 在页面上找到您感兴趣的频道（例如：电玩综合讨论区、主机综合讨论区等）。
3. 点击该频道进入频道页面。
4. 查看浏览器地址栏中的URL，找到类似 **B.php?bsn=XX** 的部分，其中 **XX** 就是该频道的ID。
5. 将该ID用于订阅相应的频道内容。
`;

        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        // https://gnn.gamer.com.tw/index.php?yy=2025&mm=12&k=4
        let year = getCurrentYear();
        let month = getCurrentMonth();
        while (month + 1 - page <= 0) {
            year -= 1;
            month += 12;
        }
        month = month + 1 - page;
        let api = `https://gnn.gamer.com.tw/index.php?yy=${year}&mm=${month}&${url}`;

        let htmlResponse = await this.client.request(
            { url: api, method: "GET" }
        );

        let $nodes = $(htmlResponse.body);
        let details: ExtensionDetail[] = [];
        let items = $nodes.find("div.BH-lbox > div[class^='GN-lbox']");
        items.each((index, element) => {
            let ele = $(element);
            let titleElement = ele.find("a").first();
            let thumbnail = titleElement.find("img").attr("src") || "";
            let link = titleElement.attr("href") || "";
            if (link && link.startsWith("//")) {
                link = "https:" + link;
            }
            // gnn.gamer.com.tw/detail.php?sn=297654 -> 297654
            let idMatch = link.match(/sn=(\d+)/);
            let id = idMatch ? idMatch[1] : "";

            let title = ele.find("h1 > a").text().trim();
            if (title === "") {
                title = ele.find("a").first().text().trim();
            }
            let category = ele.find("div.platform-tag_list").text().trim();
            let descP = ele.find("p").last();
            descP.find("a").remove();
            let desc = descP.text().trim();

            let detail = new ExtensionDetail(id, link, title);
            detail.thumbnail = thumbnail;
            detail.description = desc;
            detail.category = category;
            details.push(detail);
        });

        let hasMore = page < 48;
        return new ExtensionList(details, page, hasMore ? url : undefined);
    }

    override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        //https://forum.gamer.com.tw/B.php?page=1&bsn=74934
        let api = `https://forum.gamer.com.tw/B.php?page=${page}&bsn=${key}`;
        let htmlResponse = await this.client.request(
            { url: api, method: "GET" }
        );

        let $nodes = $(htmlResponse.body);
        let details: ExtensionDetail[] = [];
        let items = $nodes.find("table.b-list tr.b-list-item");
        items.each((index, element) => {
            let ele = $(element);

            let category = ele.find("td.b-list__summary p.b-list__summary__sort a").text().trim();
            let title = ele.find("div.b-list__tile").find("a,p").text().trim();
            let link = ele.find("div.b-list__tile").find("a,p").attr("href") || "";
            // C.php?bsn=74934&snA=5698
            let idMatch = link.match(/snA=(\d+)/);
            let id = idMatch ? idMatch[1] : "";
            link = `https://forum.gamer.com.tw/${link}`;

            let thumbnail = ele.find("div.b-list__img").attr("data-thumbnail") || "";
            let description = ele.find("td.b-list__main p.b-list__brief").text().trim();
            let date = ele.find("td.b-list__time p.b-list__time__edittime a").text().trim();

            let detail = new ExtensionDetail(id, link, title);
            detail.author = date;
            detail.thumbnail = thumbnail;
            detail.description = description;
            detail.category = category;
            details.push(detail);
        });

        let pagnationMax = $nodes.find("div#BH-pagebtn p.BH-pagebtnA a").last().text().trim();
        let hasMore = page < parseInt(pagnationMax);
        let nextPage = `https://forum.gamer.com.tw/B.php?page=${page + 1}&bsn=${key}`;
        return new ExtensionList(details, page, hasMore ? nextPage : undefined);
    }

    private async requestArtworkMedia(id: string, nodes: JQuery<HTMLElement>): Promise<ExtensionMedia> {
        let title = nodes.find("div.article-title").text().trim();
        let author = nodes.find("div.article-intro a.caption-text").text().trim();
        let date = nodes.find("div.article-intro span:eq(1)").text().trim();

        let content = nodes.find("div#article_content");

        let media = new ArticleMedia(id, title, `<html>` + (content.html() || "") + `</html>`);
        media.author = author;
        media.date = date;
        return media;
    }

    private async requestForumMedia(id: string, nodes: JQuery<HTMLElement>): Promise<ExtensionMedia> {
        let sections = nodes.find("section.c-section div.c-post");
        let firstSection = sections.first();

        let title = firstSection.find("div.c-post__header h1.c-post__header__title ").text().trim();
        let author = firstSection.find("div.c-post__header div.c-post__header__author a.username").text().trim();
        let date = firstSection.find("div.c-post__header div.c-post__header__info a.edittime").text().trim();
        let content = firstSection.find("div.c-post__body article div.c-article__content");

        let contentHtml = `<p>` + content.html() + "</p><br/>";

        sections.each((index, element) => {
            if (index === 0) {
                return; // skip first
            }
            let floor = `${index + 1}樓`;
            let ele = $(element);
            let eleAuthor = ele.find("div.c-post__header div.c-post__header__author a.username").text().trim();
            let eleDate = ele.find("div.c-post__header div.c-post__header__info a.edittime").text().trim();
            let eleContent = ele.find("div.c-post__body article div.c-article__content");

            contentHtml += `<hr><em>${floor}</em><strong>${eleAuthor}</strong><br/><em>${eleDate}</em><br/><p>` + (eleContent.html() || "") + `</p><br/>`;
        });

        let media = new ArticleMedia(id, title, `<html>` + contentHtml + `</html>`);
        media.author = author;
        media.date = date;
        return media;
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        let htmlResponse = await this.client.request(
            { url: url, method: "GET" }
        );

        let $nodes = $(htmlResponse.body);

        if ($nodes.find("div#article_content").length > 0) {
            return this.requestArtworkMedia(id, $nodes);
        } else if (url.indexOf("forum.gamer.com.tw") >= 0) {
            return this.requestForumMedia(id, $nodes);
        }
        let contentNode = $nodes.find("div.BH-lbox");
        let title = contentNode.find("h1").text().trim();

        let spanText = contentNode.find("span.GN-lbox3C").text().trim();
        // （GNN 記者 Jisho 報導） 2025-12-18 12:14:31 -> GNN 記者 Jisho 報導
        let authorMatch = spanText.match(/（(.*)）/);
        let author = authorMatch ? authorMatch[1] : "";
        let date = spanText.replace(/（.*）/, "").trim();

        let content = contentNode.find("div.GN-lbox3B");
        content.find("script").remove();

        let imgUls = content.find("ul.bh-grids-img");
        imgUls.each((index, element) => {
            let ignoreUl = $(element);
            let img = ignoreUl.find("img");
            img.insertAfter(ignoreUl);
            ignoreUl.remove();
        });
        content.find("div.slider-nav-block").remove();

        let contentHtml = `<html>` + (content.html() || "") + `</html>`;

        let media = new ArticleMedia(id, title, contentHtml);
        media.author = author;
        media.date = date;
        return media;
    }
}

(function () {
    const bahamut = new Bahamut();
    bahamut.init();
})();
export default Bahamut;