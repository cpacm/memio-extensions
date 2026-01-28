import YilinZazhi from "@app/article/yilinzazhi";
import { RuleJest } from "./../core";
import { ArticleMedia, MediaType } from "@/core/extension";

describe('yilinzazhi', () => {

    const yilinTest = new RuleJest(new YilinZazhi());

    it('should provide extension info', () => {
        const info = yilinTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.key).toBe("yilinzazhi");
        expect(info.name).toBe("意林杂志网");
        expect(info.type).toBe(MediaType.Novel);
    });

    it('should request item list', async () => {
        const url = "https://www.yilinzazhi.com";
        const page = 1;
        const list = await yilinTest.requestItemList(url, page);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.hasChapter).toBe(true);
        });
        expect(list.items.length).toBeGreaterThan(0);
        expect(list.nextPageUrl).toBeUndefined();
    });

    it('should request item chapter', async () => {
        const url = "https://www.yilinzazhi.com/2024/yl20248/index.html";
        const id = "202408";
        const detail = await yilinTest.requestItemChapter(url, id);
        expect(detail.id).toBe(id);
        expect(detail.url).toBe(url);
        expect(detail.title).toBe('《意林》2024年第8期目录');
        expect(detail.thumbnail).toBeDefined();
        detail.volumes?.forEach(v => {
            v.chapters.forEach(c => {
                expect(c.id).toBeDefined();
                expect(c.url).toBeDefined();
                expect(c.name).toBeDefined();
            });
        });
    });

    it.only('request item media', async () => {
        const url = "https://www.yilinzazhi.com/2024/yl20248/2024872901.html";
        const id = "2024872901";
        const media = await yilinTest.requestItemMedia(url, id);
        console.log(media);
        expect(media).toBeInstanceOf(ArticleMedia);
        let novelMedia = media as ArticleMedia;
        expect(novelMedia.id).toBe(id);
        expect(novelMedia.content.length).toBeGreaterThan(0);
        expect(novelMedia.title).toBe('至暗时刻');
    });
});
