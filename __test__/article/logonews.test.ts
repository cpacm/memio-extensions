import { ExtensionList, ArticleMedia, MediaType } from '@/core/extension';
import { RuleJest } from "./../core";
import LogoNews from '@app/article/logonews';

describe("LogoNews Article Test", () => {
    let ruleJest: RuleJest;
    beforeAll(() => {
        ruleJest = new RuleJest(new LogoNews());
    });

    test("Provide Extension Info", () => {
        const extInfo = ruleJest.provideExtensionInfo();
        expect(extInfo.key).toBe("logonews");
        expect(extInfo.name).toBe("标志情报局");
        expect(extInfo.type).toBe(MediaType.Article);
        expect(extInfo.baseUrl).toBe("https://www.logonews.com");
        expect(extInfo.categoryList.length).toBeGreaterThan(0);
    });

    test("Request Item List", async () => {
        const extList: ExtensionList = await ruleJest.requestItemList("category/news", 1);
        expect(extList.items.length).toBeGreaterThan(0);
        extList.items.forEach(item => {
            console.log(item);
            expect(item.id).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.url).toBeDefined();
            expect(item.type).toBe(MediaType.Article);
        });
        expect(extList.nextPageUrl).toBeDefined();
    },30000);

    test("request media detail", async () => {
        const testUrl = "https://www.logonews.cn/bethowen-new-logo.html";
        const mediaDetail = await ruleJest.requestItemMedia(testUrl,"bethowen-new-logo");
        console.log(mediaDetail);
        expect(mediaDetail.id).toBeDefined();
        expect(mediaDetail.title).toBeDefined();

        let articleMedia = mediaDetail as ArticleMedia;
        expect(articleMedia.content).toBeDefined();
        expect(articleMedia.date).toBeDefined();
    },30000);

    test.only("Search Item List", async () => {
        const extList: ExtensionList = await ruleJest.searchItemList("google", "", 1);
        expect(extList.items.length).toBeGreaterThan(0);
        extList.items.forEach(item => {
            console.log(item);
            expect(item.id).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.url).toBeDefined();
            expect(item.type).toBe(MediaType.Article);
        });
        expect(extList.nextPageUrl).toBeDefined();
    },30000);

});
