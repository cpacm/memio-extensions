import { RuleJest } from "./../core";
import { MediaType, VideoMedia } from "@/core/extension";
import BilibiliVideo from "@app/video/bilibili_video";

describe("BilibiliVideo", () => {
    const bilibiliVideoTest = new RuleJest(new BilibiliVideo());

    bilibiliVideoTest.addExtraHeaders([
        { key: "Cookie", value: "DedeUserID=265907; DedeUserID__ckMd5=ff0ee4d088d5af89;" },
        { key: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3" }
    ]);

    it("should provide extension info", () => {
        const info = bilibiliVideoTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.bilibili.com");
        expect(info.key).toBe("bilibili_video");
        expect(info.name).toBe("哔哩哔哩");
        expect(info.searchList.length).toBe(0);
        expect(info.type).toBe(MediaType.Video);
    });

    it("home should request item list", async () => {
        const url = "https://api.bilibili.com/x/web-interface/popular?pn={page}&ps=20";
        const page = 1;
        const list = await bilibiliVideoTest.requestItemList(url, page);
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

    it("channel should request channel list", async () => {
        const userId = "374377";
        const page = 1;
        const list = await bilibiliVideoTest.requestChannelList(userId, page);
        console.log(list);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.thumbnail).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(10);
    });


    it("home should request item media", async () => {
        const itemUrl = "https://www.bilibili.com/video/BV1fFyhBfE6q";
        const id = "33525468595";
        const media = await bilibiliVideoTest.requestItemMedia(itemUrl, id);
        expect(media).toBeInstanceOf(VideoMedia);
        console.log(media);
        let videoMedia = media as VideoMedia;
        expect(videoMedia.watchUrl).toBeDefined();
    });
});