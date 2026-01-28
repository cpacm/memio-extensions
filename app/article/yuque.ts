import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, MediaType, ArticleMedia, ItemVolume, ItemChapter, Channel, ChannelType } from '@/core/extension';
import { formatDateToYMD } from '@/utils/date';

class Yuque extends Rule {
    provideExtensionInfo(): Extension {
        let site = new Extension("yuque", "语雀", MediaType.Article)
        site.baseUrl = "https://www.yuque.com";
        site.description = "语雀是面向个人和团队的知识创作与分享平台，帮助你更高效地沉淀和传递知识。";
        site.thumbnail = "https://gw.alipayobjects.com/zos/rmsportal/UTjFYEzMSYVwzxIGVhMu.png";
        site.lang = "zh";
        site.categoryList = [];
        site.channel = new Channel(ChannelType.List, "user/group", "slug");
        site.useGuide = "在语雀中，用户可以通过设置用户名（如 https://www.yuque.com/wikidesign）或团队名访问其主页，从而浏览其公开的文档和知识库。要使用本扩展，请输入语雀用户或团队的名称作为频道标识符。例如，输入 'wikidesign' 以访问该用户的公开内容。";

        return site;
    }

    userIdMap: Map<string, string> = new Map<string, string>();

    private async fecthJsonFromHtml(html: string): Promise<string> {
        // search window.appData = JSON.parse(decodeURIComponent('...'));
        //console.log(html);
        let regex = /window\.appData = JSON\.parse\(decodeURIComponent\("(.+?)"\)\);/;
        let match = html.match(regex);
        if (match && match[1]) {
            let jsonString = decodeURIComponent(match[1]);
            console.log("Fetched appData JSON:", jsonString);
            return jsonString;
        }
        return "";
    }

    private async fetchGroupDatabase(groupId: string): Promise<ExtensionDetail[]> {
        // https://www.yuque.com/api/groups/594848/bookstacks
        let databaseUrl = `https://www.yuque.com/api/groups/${groupId}/bookstacks`;
        let dbResponse = await this.client.request({
            url: databaseUrl,
            method: "GET",
            contentType: "application/json",
        });
        let databaseJson = dbResponse.body;
        let dbData = JSON.parse(databaseJson);
        let categorys = dbData?.data;
        let items: ExtensionDetail[] = [];
        categorys.forEach((category: any) => {
            let books = category.books;
            let categoryName = category.name || "BOOKS";
            books.forEach((book: any) => {
                let id = book.id;
                //https://www.yuque.com/api/docs?book_id=42469873
                let url = `https://www.yuque.com/api/docs?book_id=${id}`;
                let title = book.name;
                let thumbnail = book.cover;
                let date = book.updated_at;
                let dateTxt = formatDateToYMD(date);

                let detail = new ExtensionDetail(id, url, title);
                detail.description = book.description;
                detail.author = book.user?.name;
                detail.thumbnail = thumbnail;
                detail.status = dateTxt;
                detail.category = categoryName;
                detail.type = MediaType.Article;
                detail.hasChapter = true;
                this.userIdMap.set(`book_${id}`, JSON.stringify(detail));
                items.push(detail);
            });

        });
        return items;
    }


    private async fetchUserDatabase(userId: string, username: string): Promise<ExtensionDetail[]> {
        //https://www.yuque.com/api/groups/84141/homepage_public?scene=1
        let key = `user_database_${userId}`;
        let databaseString = this.userIdMap.get(key);
        if (!databaseString) {
            let homepage = `https://www.yuque.com/api/groups/${userId}/homepage_public?scene=1`;
            let response = await this.client.request({
                url: homepage,
                method: "GET",
                contentType: "application/json",
            });

            let data = JSON.parse(response.body);
            if (!data || !data.data || !data.data[0].placements) {
                return [];
            }
            let placements = data.data[0]?.placements[0]?.blocks ?? undefined;
            if (!placements) {
                return [];
            }

            let databaseId = "";

            // find "type": "publicPageBookStack",
            for (let placement of placements) {
                if (placement.type === "publicPageBookStack") {
                    databaseId = placement.id;
                    break;
                }
            }
            if (databaseId === "") {
                return [];
            }

            // https://www.yuque.com/api/book_stack_maps?id=20861136557
            let databaseUrl = `https://www.yuque.com/api/book_stack_maps?id=${databaseId}`;
            let dbResponse = await this.client.request({
                url: databaseUrl,
                method: "GET",
                contentType: "application/json",
            });
            let databaseJson = dbResponse.body;
            databaseString = databaseJson;
            this.userIdMap.set(key, databaseJson);
        }
        let dbData = JSON.parse(databaseString);
        let books = dbData?.data;
        let items: ExtensionDetail[] = [];
        books.forEach((book: any) => {
            let id = book.id;
            //https://www.yuque.com/api/docs?book_id=42469873
            let url = `https://www.yuque.com/api/docs?book_id=${id}`;
            let title = book.name;
            let thumbnail = book.cover;
            let date = book.updated_at;
            let dateTxt = formatDateToYMD(date);

            let detail = new ExtensionDetail(id, url, title);
            detail.description = book.description;
            detail.author = username;
            detail.thumbnail = thumbnail;
            detail.status = dateTxt;
            detail.category = "BOOK";
            detail.type = MediaType.Article;
            detail.hasChapter = true;
            this.userIdMap.set(`book_${id}`, JSON.stringify(detail));
            items.push(detail);
        });
        return items;
    }

    private async fetchUserArticles(username: string, page: number): Promise<ExtensionList> {
        let userId = this.userIdMap.get(username);
        let isGroupId = false;
        if (!userId) {
            // https://www.yuque.com/wikidesign
            let htmlResponse = await this.client.request({
                url: `https://www.yuque.com/${username}`,
                method: "GET",
            });

            let appDataJson = await this.fecthJsonFromHtml(htmlResponse.body);
            let appData = JSON.parse(appDataJson);
            let uid = appData?.user?.id;
            let groupId = appData?.group?.id;
            if (!uid && !groupId) {
                return new ExtensionList([], page, undefined);
            }
            if (uid) {
                isGroupId = false;
                userId = uid;
                this.userIdMap.set(username, uid);
            } else if (groupId) {
                isGroupId = true;
                userId = groupId;
                this.userIdMap.set(username, groupId);
            }
        }
        if (userId === undefined) {
            return new ExtensionList([], page, undefined);
        }

        let items: ExtensionDetail[] = [];

        if (isGroupId) {
            let databaseDetails = await this.fetchGroupDatabase(userId);
            items.push(...databaseDetails);
            return new ExtensionList(items, page, undefined);
        }

        if (page == 1) {
            let databaseDetails = await this.fetchUserDatabase(userId, username);
            items.push(...databaseDetails);
        }

        // https://www.yuque.com/api/events/public?offset=20&limit=20&id=275935
        let apiUrl = `https://www.yuque.com/api/events/public?limit=20&id=${userId}`;
        let offset = (page - 1) * 20;
        apiUrl += `&offset=${offset}`;

        console.log("Fetching Yuque user articles from URL:", apiUrl);

        let response = await this.client.request({
            url: apiUrl,
            method: "GET",
            contentType: "application/json",
        });

        let data = JSON.parse(response.body);

        let dataList = data?.data || [];
        dataList.forEach((element: any) => {
            if (element.subject_type === "Note") {
                let note = element.data;
                let id = note.slug;
                let url = `https://www.yuque.com/r/note/${note.slug}`;
                let author = username;
                let date = note.created_at;
                let dateTxt = formatDateToYMD(date);
                let $nodes = $(note.doclet.body_html);

                let titleNode = $nodes.find("h1,h2,h3").first();
                let title = titleNode.text() || "无标题";
                titleNode.remove();
                let descriptionText = $nodes.text();

                let detail = new ExtensionDetail(id, url, title);
                detail.description = descriptionText;
                detail.status = dateTxt;
                detail.author = author;
                detail.category = "NOTE";
                detail.type = MediaType.Article;
                detail.hasChapter = false;

                items.push(detail);
            }
        });

        let hasMore = data.meta.hasMore;
        return new ExtensionList(items, page, hasMore ? `next` : undefined);
    }

    override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        let username = key;
        let list = await this.fetchUserArticles(username, page);
        return list;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        return new ExtensionList([], page, undefined);
    }

    override async requestItemChapter(url: string, id: string): Promise<ExtensionDetail> {
        let bookKey = `book_${id}`;
        let bookDetailString = this.userIdMap.get(bookKey);
        let bookDetail: ExtensionDetail | undefined = undefined;
        if (bookDetailString) {
            let detail = JSON.parse(bookDetailString);
            bookDetail = new ExtensionDetail(id, url, detail.title);
            bookDetail.description = detail.description;
            bookDetail.author = detail.author;
            bookDetail.thumbnail = detail.thumbnail;
            bookDetail.status = detail.status;
            bookDetail.category = detail.category;
            bookDetail.type = MediaType.Article;
            bookDetail.hasChapter = true;
        } else {
            bookDetail = new ExtensionDetail(id, url, "");
        }

        // https://www.yuque.com/api/docs?book_id=42469873
        let response = await this.client.request({
            url: url,
            method: "GET",
            contentType: "application/json",
        });

        console.log("Requesting item chapter from URL:", url);

        let data = JSON.parse(response.body);
        let docs = data?.data || [];
        let chapters: ItemChapter[] = [];
        docs.forEach((doc: any) => {
            //https://www.yuque.com/api/docs/fyunc42hpgmlfe7d?book_id=42469873&merge_dynamic_data=false
            let chapterId = doc.slug;
            let chapterName = doc.title;
            let chapterUrl = `https://www.yuque.com/api/docs/${chapterId}?book_id=${id}`;
            let chapter = new ItemChapter(chapterId, chapterUrl, chapterName);
            chapters.push(chapter);
        });
        let volume = new ItemVolume("全部文档", chapters);

        bookDetail.volumes = [volume];
        return bookDetail;
    }

    private async parseCardToTag(html: string): Promise<string> {
        let cleanHtml = html.replace(/<!doctype lake>/g, "");
        const cardRegex = /(<card[^>]*>[\s\S]*?<\/card>)/g;
        let cards = cleanHtml.match(cardRegex) || [];

        for (let index = 0; index < cards.length; index++) {
            let cardEle = $(cards[index]);

            let name = cardEle.attr("name") || "";
            let dataValue = decodeURIComponent(cardEle.attr("value") || "");
            // remove data: prefix if exists
            if (dataValue.startsWith("data:")) {
                dataValue = dataValue.substring(dataValue.indexOf(":") + 1);
            }
            let dataJson: any;
            try{
                dataJson = JSON.parse(dataValue);
            }catch{
                console.log("Failed to parse card data JSON:", dataValue); 
                continue;
            }

            let tagText = "";
            switch (name) {
                case "bookmarkInline":
                    let detail = dataJson.detail || "";
                    let link = detail.url;
                    let title = detail.title || link;
                    tagText = `<a href="${link}">${title}</a>`;
                    break;
                case "bookmarklink":
                    let linkDetail = dataJson.detail || "";
                    let linkUrl = linkDetail.url;
                    let linkTitle = linkDetail.title || "";
                    let linkPoster = linkDetail.image || "";
                    if (linkUrl) {
                        tagText = `<iframe src="${linkUrl}" title="${linkTitle}" poster="${linkPoster}"></iframe>`;
                    }
                    break;
                case "codeblock":
                    let codeMode = dataJson.mode || "text";
                    let codeContent = dataJson.code || "";
                    tagText = `<pre><code class="language-${codeMode}">${codeContent}</code></pre>`;
                    break;
                case "image":
                    let src = dataJson.src || "";
                    let imgTitle = dataJson.title || "";
                    tagText = `<img src="${src}" alt="${imgTitle}"/>`;
                    break;
                case "file":
                    let fileSrc = dataJson.src || "";
                    let fileName = dataJson.name || fileSrc;
                    let fileType = dataJson.type || "application/octet-stream";
                    tagText = `<embed src="${fileSrc}" type="${fileType}" title="${fileName}"/>`;
                    break;
                case "localDoc":
                    let docTitle = dataJson.name || "本地文档";
                    let docUrl = dataJson.url || "#";
                    let docType = dataJson.type || "application/octet-stream";
                    tagText = `<embed src="${docUrl}" type="${docType}" title="${docTitle}"/>`;
                    break;
                case "youku":
                    let videoUrl = dataJson.url || "";
                    if (videoUrl) {
                        tagText = `<iframe src="${videoUrl}" style="width:100%; height:500px" frameborder="0" allowfullscreen></iframe>`;
                    }
                    break;
                case "yuqueinline":
                case "yuque":
                    let yuqueDetail = dataJson.detail || "";
                    let yuequeLink = yuqueDetail.url;
                    let yuqueTitle = yuqueDetail.title;
                    let yuqueCover = yuqueDetail.image || "";
                    tagText = `<iframe src="${yuequeLink}" title="${yuqueTitle}" poster="${yuqueCover}"></iframe>`;
                    break;
                case "board":
                    tagText = `<p>[看板内容无法显示，请前往语雀查看]</p>`;
                    break;
                case "math":
                    let mathCode = dataJson.code || "";
                    tagText = `<pre><math class="math-inline">\\(${mathCode}\\)</math></pre>`;
                    break;
                case "video":
                    let videoCover = dataJson.coverUrl || "";
                    let videoTitle = dataJson.name || "视频";
                    let videoId = dataJson.videoId || "";
                    // https://www.yuque.com/api/video?video_id=ad86ec06fe724e6f8c8ad7ba1721a2fc
                    let videoSrc = `https://www.yuque.com/api/video?video_id=${videoId}`;
                    let response = await this.client.request({ url: videoSrc, method: "GET", contentType: "application/json" });
                    let videoData = JSON.parse(response.body);
                    videoSrc = videoData?.data?.info?.video || videoSrc;
                    tagText = `<video controls src="${videoSrc}" title="${videoTitle}" poster="${videoCover}">您的浏览器不支持 video 标签。</video>`;
                    break;
                case "thirdparty":
                    let thirdUrl = dataJson.url || "";
                    let thirdParty = dataJson.type || "第三方内容";
                    tagText = `<embed src="${thirdUrl}" title="${thirdParty}"></embed>`;
                    break;
                default:
                    tagText = `<p>[未知卡片类型: ${name}]</p>`;
                    break;
            }
            if (tagText.length > 0) {
                let cardHtml = cards[index];
                cleanHtml = cleanHtml.replace(cardHtml, tagText);
            }
        }
        return cleanHtml;
    }

    private async fetchBookNoteContent(url: string, id: string): Promise<ExtensionMedia> {
        // https://www.yuque.com/api/docs/fyunc42hpgmlfe7d?book_id=42469873&merge_dynamic_data=false
        let response = await this.client.request({
            url: url,
            method: "GET",
            contentType: "application/json",
        });

        let data = JSON.parse(response.body);
        let doc = data?.data;
        let contentHtml = `<html>${doc?.content || ""}</html>`;
        let content = await this.parseCardToTag(contentHtml);
        let title = doc?.title || "";

        let media = new ArticleMedia(id, title, content);
        media.author = doc?.user?.name || "";
        media.date = formatDateToYMD(doc?.created_at || "");
        return media;
    }

    private async fetchUserNoteContent(url: string, id: string): Promise<ExtensionMedia> {
        //https://www.yuque.com/r/note/9a314a14-e0c0-4d50-b876-6131cfe15339
        let htmlResponse = await this.client.request({
            url: url,
            method: "GET",
        });

        let appDataJson = await this.fecthJsonFromHtml(htmlResponse.body);
        let appData = JSON.parse(appDataJson);
        let note = appData?.note;
        let doclet = note.doclet;
        let contentHtml = `<html>${doclet?.body || ""}</html>`;
        let content = await this.parseCardToTag(contentHtml);

        let media = new ArticleMedia(id, "", content);
        media.author = appData?.user?.name || "";
        media.date = formatDateToYMD(doclet?.content_updated_at || "");
        return media;

    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        // https://www.yuque.com/api/docs/fyunc42hpgmlfe7d?book_id=42469873&merge_dynamic_data=false
        if (url.includes("/api/docs/")) {
            return this.fetchBookNoteContent(url, id);
        } else if (url.includes("/r/note/")) {
            return this.fetchUserNoteContent(url, id);
        } else {
            return new ArticleMedia("-1", "", "");
        }
    }

}


(function () {
    let rule = new Yuque();
    rule.init();
})();

export default Yuque;