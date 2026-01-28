import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";
import Douban from "@app/article/douban";

describe("Douban", () => {
    const doubanTest = new RuleJest(new Douban());

    it("should provide extension info", () => {
        const info = doubanTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.douban.com");
        expect(info.key).toBe("douban");
        expect(info.name).toBe("豆瓣");
        expect(info.type).toBe(MediaType.Article);
        expect(info.categoryList.length).toBeGreaterThan(0);
    });

    it("should request item list from category", async () => {
        const url = "https://book.douban.com/review/best/"; // 书籍书评
        const page = 1;
        const list = await doubanTest.requestItemList(url, page);
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.author).toBeDefined();
            expect(item.description).toBeDefined();
            expect(item.status).toBeDefined();
        });
        expect(list.nextPageUrl).toBeDefined();
    });

    it("should request item list from channel (group)", async () => {
        const groupId = "701765"; // A sample group ID for testing
        const page = 1;
        const list = await doubanTest.requestChannelList(groupId, page);
        expect(list.items.length).toBeGreaterThan(0);
        console.log(list.items);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.author).toBeDefined();
            expect(item.category).toBeDefined();
        });
        expect(list.nextPageUrl).toBeDefined();
    });

    it("should get review item media", async () => {
        const itemUrl = "https://book.douban.com/review/17257400/";
        const id = "17257400";
        const media = await doubanTest.requestItemMedia(itemUrl, id);
        expect(media).toBeInstanceOf(ArticleMedia);
        let articleMedia = media as ArticleMedia;
        expect(articleMedia).toBeDefined();
        expect(articleMedia.id).toBe(id);
        expect(articleMedia.title).toBeDefined();
        expect(articleMedia.content.length).toBeGreaterThan(0);
        expect(articleMedia.author).toBeDefined();
        expect(articleMedia.date).toBeDefined();
    });

    it.only("should get topic item media", async () => {
        const itemUrl = "https://www.douban.com/group/topic/342824413/?_spm_id=MTg5NTQzNzM2";
        const id = "342824413";
        const media = await doubanTest.requestItemMedia(itemUrl, id);
        console.log(media);
        expect(media).toBeInstanceOf(ArticleMedia);
        let articleMedia = media as ArticleMedia;
        expect(articleMedia).toBeDefined();
        expect(articleMedia.id).toBe(id);
        expect(articleMedia.title).toBeDefined();
        expect(articleMedia.content.length).toBeGreaterThan(0);
        expect(articleMedia.author).toBeDefined();
        expect(articleMedia.date).toBeDefined();
    });
});
