import { RuleJest } from "./../core";
import { AudioMedia, MediaType, SiteHeader } from "@/core/extension";
import XiaoYuZhouFm from "@app/audio/xiaoyuzhoufm";

describe("XiaoYuZhouFm", () => {
    const xiaoyuzhoufmTest = new RuleJest(new XiaoYuZhouFm());
    xiaoyuzhoufmTest.addExtraHeaders([
         { key: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/ 89.0.4389.82 Safari/537.36" }
    ]);

    it("should provide extension info", () => {
        const info = xiaoyuzhoufmTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.xiaoyuzhoufm.com");
        expect(info.key).toBe("xiaoyuzhoufm");
        expect(info.name).toBe("小宇宙");
        expect(info.type).toBe(MediaType.Audio);
    });

    it("channel should request channel list", async () => {
        const podcastId = "6021f949a789fca4eff4492c";
        const page = 1;
        const list = await xiaoyuzhoufmTest.requestChannelList(podcastId, page);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(10);
    }, 10000);


    it("should request item media", async () => {
        const itemUrl = "https://www.xiaoyuzhoufm.com/episode/66d50331922172a72a129f89";
        const id = "60365d5f84056b20cdf9fa23";
        const media = await xiaoyuzhoufmTest.requestItemMedia(itemUrl, id);
        expect(media).toBeInstanceOf(AudioMedia);
        console.log(media);
        let audioMedia = media as AudioMedia;
        expect(audioMedia.playUrl).toBeDefined();
        expect(audioMedia.title).toBeDefined();
        expect(audioMedia.artist).toBeDefined();
        expect(audioMedia.duration).toBeGreaterThan(0);
    }, 10000);
});
