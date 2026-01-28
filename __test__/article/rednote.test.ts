import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";
import RedNote from "@app/article/rednote";

describe("RedNote", () => {
    const rednoteTest = new RuleJest(new RedNote());

    rednoteTest.addExtraHeaders([
        { key: "Cookie", value: "web_session=040069b6e7da4e40e0dbaea7cf3a4bed51d1fb;" },
    ]);

    it("should provide extension info", () => {
        const info = rednoteTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.xiaohongshu.com");
        expect(info.key).toBe("rednote");
        expect(info.name).toBe("小红书");
        expect(info.searchList.length).toBe(1);
        expect(info.type).toBe(MediaType.Article);
    });

    it("explore should request item list", async () => {
        const url = "https://www.xiaohongshu.com/explore?channel_id=homefeed_recommend";
        const page = 1;
        const list = await rednoteTest.requestItemList(url, page);
        //console.log(list);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
            expect(item.author).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(10);
    });

    it("should request channel list", async () => {
        const userId = "675befb4000000001801ce6f";
        const page = 1;
        const list = await rednoteTest.requestChannelList(userId, page);
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

    it("should get item detail", async () => {
        const itemUrl = "https://www.xiaohongshu.com/explore/68fafa19000000000700b9cc?xsec_token=ABANaXPF1M57z8C5cb1d9dLP6AJAQNaWcZ4iS2u8KyJrY=";
        const id = "68fafa19000000000700b9cc";
        const media = await rednoteTest.requestItemMedia(itemUrl, id);
        expect(media).toBeInstanceOf(ArticleMedia);
        console.log(media);
        let articleMedia = media as ArticleMedia;
        expect(articleMedia).toBeDefined();
        expect(articleMedia.id).toBe(id);
        expect(articleMedia.title).toBeDefined();
        expect(articleMedia.content.length).toBeGreaterThan(0);
        expect(articleMedia.author).toBeDefined();
        expect(articleMedia.date).toBeDefined();
    });

});