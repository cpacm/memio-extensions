import Syosetu from "@app/novel/syosetu";
import { RuleJest } from "./../core";
import { MediaType, NovelMedia } from "@/core/extension";

describe('syosetu', () => {

    const syosetuTest = new RuleJest(new Syosetu());

    it('should provide extension info', () => {
        const info = syosetuTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.key).toBe("syosetu");
        expect(info.name).toBe("小説家になろう");
        expect(info.type).toBe(MediaType.Novel);
    });

    it.only('should request item list', async () => {
        const url = "/rank/attnlist/type/total/?p={page}";
        const page = 1;
        const list = await syosetuTest.requestItemList(url, page);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.description).toBeDefined();
            expect(item.category).toBeDefined();
            expect(item.author).toBeDefined();
            expect(item.hasChapter).toBe(true);
        });
        expect(list.items.length).toBeGreaterThan(0);
        expect(list.nextPageUrl).toBe('/rank/attnlist/type/total/?p=2');
    }, 20000);

    it('should request item chapter for a novel with multiple chapters', async () => {
        const url = "https://ncode.syosetu.com/n8281jr/";
        const id = "n8281jr";
        const detail = await syosetuTest.requestItemChapter(url, id);
        console.log(detail);
        expect(detail.id).toBe(id);
        expect(detail.url).toBe(url);
        expect(detail.title).toBe('「美人でお金持ちで高嶺の花だと噂のクラスメイト、実は俺のことが好きすぎる」');
        detail.volumes?.forEach(v => {
            v.chapters.forEach(c => {
                expect(c.id).toBeDefined();
                expect(c.url).toBeDefined();
                expect(c.name).toBeDefined();
                console.log(c);
            });
        });
        expect(detail.volumes).toBeDefined();
        if (detail.volumes) {
            expect(detail.volumes.length).toBeGreaterThan(0);
            expect(detail.volumes[0].chapters.length).toBeGreaterThan(0);
        }
    }, 20000);

    it('should request item chapter for a short story', async () => {
        const url = "https://ncode.syosetu.com/n8065lj/";
        const id = "n8065lj";
        const detail = await syosetuTest.requestItemChapter(url, id);
        console.log(detail);
        expect(detail.id).toBe(id);
        expect(detail.url).toBe(url);
        expect(detail.title).toBe('【短編】幼馴染の俺が、同じく幼馴染のあいつに告白する話。');
        expect(detail.volumes).toBeDefined();
        if (detail.volumes) {
            expect(detail.volumes.length).toBe(1);
            expect(detail.volumes[0].chapters.length).toBe(1);
            expect(detail.volumes[0].chapters[0].id).toBe(id);
        }
    }, 20000);

    it('request item media', async () => {
        const url = "https://ncode.syosetu.com/n8281jr/1/";
        const id = "1";
        const media = await syosetuTest.requestItemMedia(url, id);
        expect(media).toBeInstanceOf(NovelMedia);
        let novelMedia = media as NovelMedia;
        console.log(novelMedia);
        expect(novelMedia.id).toBe(id);
        expect(novelMedia.content.length).toBeGreaterThan(0);
        expect(novelMedia.title).toBe('プロローグ');
    }, 20000);
});
