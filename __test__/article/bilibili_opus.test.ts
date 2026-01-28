import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";
import BilibiliOpus from "@app/article/bilibili_opus";

describe("BilibiliOpus", () => {
    const bilibiliOpusTest = new RuleJest(new BilibiliOpus());

    bilibiliOpusTest.addExtraHeaders([
        { key: "Cookie", value: "DedeUserID=265907; DedeUserID__ckMd5=ff0ee4d088d5af89;" },
    ]);

    it("should provide extension info", () => {
        const info = bilibiliOpusTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.bilibili.com");
        expect(info.key).toBe("bilibili_opus");
        expect(info.name).toBe("哔哩哔哩-专栏");
        expect(info.searchList.length).toBe(0);
        expect(info.type).toBe(MediaType.Article);
    });

    it("home should request item list", async () => {
        const url = "https://www.bilibili.com/read/home/";
        const page = 1;
        const list = await bilibiliOpusTest.requestItemList(url, page);
        console.log(list);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.author).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(10);
    });

    it("channel should request item list", async () => {
        const userId = "535889";
        const page = 1;
        const list = await bilibiliOpusTest.requestChannelList(userId, page);
        console.log(list);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(10);

    });

    it("should get item detail", async () => {
        const itemUrl = "https://www.bilibili.com/read/cv43409807";
        const id = "43409807";
        const media = await bilibiliOpusTest.requestItemMedia(itemUrl, id);
        expect(media).toBeInstanceOf(ArticleMedia);
        console.log(media);
        let articleMedia = media as ArticleMedia;
        expect(articleMedia.content).toBeDefined();
    });
});