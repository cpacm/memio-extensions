import { ExtensionList, ArticleMedia, MediaType } from '@/core/extension';
import { RuleJest } from "./../core";
import A9vg from '@app/article/a9vg';

describe('A9vg', () => {
    const a9vg = new RuleJest(new A9vg());

    it('provideExtensionInfo should return correct extension info', () => {
        const info = a9vg.provideExtensionInfo();
        expect(info.key).toBe('a9vg');
        expect(info.name).toBe('A9VG电玩部落');
        expect(info.lang).toBe('zh');
        expect(info.baseUrl).toBe('https://www.a9vg.com');
        expect(info.type).toBe(MediaType.Article);
    });

    it('requestItemList should fetch and parse articles', async () => {
        const url = 'PS4';
        const page = 2;
        const list: ExtensionList = await a9vg.requestItemList(url, page);
        expect(list.items.length).toBeGreaterThan(0);
        console.log(list);
        list.items.forEach(item => {
            
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.description).toBeDefined();
        });
        expect(list.nextPageUrl).toBeDefined();
    }, 30000);

    it.only('requestItemMedia should fetch and parse article media', async () => {
        const url = 'https://www.a9vg.com/article/238646';
        const id = '238646';
        const media: ArticleMedia = await a9vg.requestItemMedia(url, id) as ArticleMedia;
        console.log(media);
        expect(media).toBeDefined();
        expect(media.id).toBe(id);
        expect(media.title).toBeDefined();
        expect(media.content).toBeDefined();
    }, 30000);
});