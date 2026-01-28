import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";
import WallStreetCN from "@app/article/wallstreetcn";

describe("WallStreetCN", () => {
    const wallstreetcnTest = new RuleJest(new WallStreetCN());

    it("should provide extension info", () => {
        const info = wallstreetcnTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://wallstreetcn.com");
        expect(info.key).toBe("wallstreetcn");
        expect(info.name).toBe("华尔街见闻");
        expect(info.type).toBe(MediaType.Article);
    });

    it("should request item list from a feed", async () => {
        const url = "global";
        const page = 1;
        const list = await wallstreetcnTest.requestItemList(url, page);
        
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.author).toBeDefined();
        });
    });

    it.only("should search item list", async () => {
        const keyword = "美联储";
        const url = "search";
        const page = 1;
        const list = await wallstreetcnTest.searchItemList(keyword, url, page);

        console.log(list);
        
        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.author).toBeDefined();
        });
    });

    it("should request item media", async () => {
        // First, get a list of items to have a valid ID
        const media = await wallstreetcnTest.requestItemMedia("https://wallstreetcn.com/articles/3757862", "3757862") as ArticleMedia;

        expect(media).toBeDefined();
        expect(media.content).toBeDefined();
        expect(media.title).toBe("千亿市值岌岌可危！利润暴跌20%后，“中药茅”片仔癀靠什么翻盘？");
        expect(media.id).toBe("3757862");
    });
});
