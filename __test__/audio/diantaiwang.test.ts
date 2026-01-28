import DianTaiWang from "@app/audio/diantaiwang";
import { RuleJest } from "./../core";
import { MediaType, AudioMedia } from "@/core/extension";


describe("DianTaiWang", () => {
    const diantaiwangTest = new RuleJest(new DianTaiWang());

    it("should provide extension info", () => {
        const info = diantaiwangTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.diantaiwang.com");
        expect(info.key).toBe("diantaiwang");
        expect(info.name).toBe("电台网");
        expect(info.searchList.length).toBe(0);
        expect(info.type).toBe(MediaType.Audio);
    });

    it("should request item list", async () => {
        const url = "/zonghe/";
        const page = 1;
        const list = await diantaiwangTest.requestItemList(url, page);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
        });
        expect(list.items.length).toBeGreaterThan(0);
        expect(list.nextPageUrl).toBeUndefined();
    });

    it("should request item media", async () => {
        const url = "/radio/anhuizhisheng.html";
        const id = "anhuizhisheng"; // Example ID
        const media = await diantaiwangTest.requestItemMedia(url, id);
        expect(media).toBeDefined();
        expect(media.id).toBe(id);
        expect(media).toBeInstanceOf(AudioMedia);

        var audio = media as AudioMedia;
        expect(audio.playUrl).toBe("https://lhttp.qingting.fm/live/4919/64k.mp3");
        expect(audio.duration).toBe(-1);
    });
});