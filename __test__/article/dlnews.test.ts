import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";
import DLNews from "@app/article/dlnews";

describe("DLNews", () => {
    const dlnewsTest = new RuleJest(new DLNews());

    it("should provide extension info", () => {
        const info = dlnewsTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.dlnews.com");
        expect(info.key).toBe("dlnews");
        expect(info.name).toBe("DL News");
        expect(info.searchList.length).toBe(1);
        expect(info.type).toBe(MediaType.Article);
    });

    it("explore should request item list", async () => {
        const url = "defi"; // category
        const page = 1;
        const list = await dlnewsTest.requestItemList(url, page);
        console.log(list);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.author).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(0);
    });

    it("should search item list", async () => {
        const keyword = "crypto";
        const url = ""; // not used in search
        const page = 1;
        const list = await dlnewsTest.searchItemList(keyword, url, page);
        // console.log(list);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.author).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(0);
    },30000);

    it("should get item detail", async () => {
        // This item is from the result of the `explore` test
        const itemUrl = "https://www.dlnews.com/articles/markets/fire-sale-valuations-for-btc-price-says-bitwise/";
        const id = "20240514093000-3b2a7f5d6d7c";
        const media = await dlnewsTest.requestItemMedia(itemUrl, id);
        expect(media).toBeInstanceOf(ArticleMedia);
        console.log(media);
        let articleMedia = media as ArticleMedia;
        expect(articleMedia).toBeDefined();
        expect(articleMedia.id).toBe(id);
        expect(articleMedia.title).toBeDefined();
        expect(articleMedia.content.length).toBeGreaterThan(0);
        expect(articleMedia.author).toBeDefined();
        expect(articleMedia.date).toBeDefined();
    },30000);

});
