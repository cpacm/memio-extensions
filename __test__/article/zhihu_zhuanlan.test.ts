import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";
import Zhihu from "@app/article/zhihu_zhuanlan";

describe("ZhihuZhuanlan", () => {
    const zhihuTest = new RuleJest(new Zhihu());

    zhihuTest.addExtraHeaders([
        { key: "Cookie", value: "__zse_ck=004_j0Ok3lqYjnZjj6x04twI8tLhZPc0FmKnQKGFY7rnz6OkJuVCjtLrikA2XTv4Nr8AVfj/ilhFGQFc1gdeoaHhIewBoHEYRBTmERwWqQWtABqYjWWewRRQxA=cKq6BuqGK-2EOSOev3Om1GC1qXlIexIAbiKfKt0GbgE1cdcvYg7qTr3S4woPx8xjpld2a7D1/D3k3awePdW8tFF49b31nZR4fYuez02MZz1PTbchdrsKNAbmdeKsOYNHq2SQQAYCt2;" },
    ]);

    it("should provide extension info", () => {
        const info = zhihuTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.zhihu.com");
        expect(info.key).toBe("zhihu_zhuanlan");
        expect(info.name).toBe("知乎-专栏");
        expect(info.categoryList.length).toBeGreaterThan(0);
        expect(info.type).toBe(MediaType.Article);
    });

    it("explore should request item list", async () => {
        const url = "/api/v4/column/recommend/web"; // category
        const page = 1;
        const list = await zhihuTest.requestItemList(url, page);
        console.log(list);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.author).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(0);
    }, 30000);

    it("should request channel list", async () => {
        const channelKey = "yixinli"; // Example channel key
        const page = 2;
        const list = await zhihuTest.requestChannelList(channelKey, page);
        console.log(list);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.author).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(0);

    }, 30000);

    it("should get item detail", async () => {
        // This item is from the result of the `explore` test
        const itemUrl = "https://zhuanlan.zhihu.com/p/349435528";
        const id = "349435528";
        const media = await zhihuTest.requestItemMedia(itemUrl, id);
        expect(media).toBeInstanceOf(ArticleMedia);
        console.log(media);
        let articleMedia = media as ArticleMedia;
        expect(articleMedia).toBeDefined();
        expect(articleMedia.id).toBe(id);
        expect(articleMedia.title).toBeDefined();
        expect(articleMedia.content.length).toBeGreaterThan(0);
        expect(articleMedia.author).toBeDefined();
        expect(articleMedia.date).toBeDefined();
    }, 30000);

});
