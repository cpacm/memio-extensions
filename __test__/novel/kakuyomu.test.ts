import Kakuyomu from "@app/novel/kakuyomu";
import { RuleJest } from "./../core";
import { MediaType, NovelMedia } from "@/core/extension";

describe('kakuyomu', () => {

    const kakuyomuTest = new RuleJest(new Kakuyomu());

    it('should provide extension info', () => {
        const info = kakuyomuTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.key).toBe("kakuyomu");
        expect(info.name).toBe("カクヨム");
        expect(info.type).toBe(MediaType.Novel);
    });

    it('should request item list', async () => {
        const url = "order=weekly_ranking";
        const page = 1;
        const list = await kakuyomuTest.requestItemList(url, page);
        console.log(list);
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
        expect(list.nextPageUrl).toBe('https://kakuyomu.jp/search?order=weekly_ranking&page=2');
    }, 20000);

    it.only('should search item list', async () => {
        const keyword = "性転換";
        const url = "https://kakuyomu.jp/search?order=last_episode_published_at&q={keyword}";
        const page = 1;
        const list = await kakuyomuTest.searchItemList(keyword, url, page);
        console.log(list);
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
        // expect(list.nextPageUrl).toBe('https://kakuyomu.jp/search?order=last_episode_published_at&q=魔法&page=2'); --- IGNORE ---
    }, 20000);

    it('should request item chapter for a novel with multiple chapters', async () => {
        const url = "https://kakuyomu.jp/works/16818622174699241353";
        const id = "16818622174699241353";
        const detail = await kakuyomuTest.requestItemChapter(url, id);
        console.log(detail);
        expect(detail.id).toBe(id);
        expect(detail.url).toBe(url);
        expect(detail.title).toBe('マギアタクサ———悪徳領主の娘を全力で光堕ちさせる話');
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

    it('request item media', async () => {
        const url = "https://kakuyomu.jp/works/16818622175821804595/episodes/822139840475558596";
        const id = "822139840475558596";
        const media = await kakuyomuTest.requestItemMedia(url, id);
        expect(media).toBeInstanceOf(NovelMedia);
        let novelMedia = media as NovelMedia;
        console.log(novelMedia);
        expect(novelMedia.id).toBe(id);
        expect(novelMedia.content.length).toBeGreaterThan(0);
        expect(novelMedia.title).toBe('1節．仰ぐべき主は誰なのか');
    }, 20000);
});
