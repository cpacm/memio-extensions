import { ExtensionList, ArticleMedia, MediaType } from '@/core/extension';
import { RuleJest } from "./../core";
import Famitsu from "@app/article/famitsu";

describe('Famitsu', () => {
    const famitsu = new RuleJest(new Famitsu());

    it('provideExtensionInfo should return correct extension info', () => {
        const info = famitsu.provideExtensionInfo();
        expect(info.key).toBe('famitsu');
        expect(info.name).toBe('ファミ通');
        expect(info.lang).toBe('ja');
        expect(info.baseUrl).toBe('https://www.famitsu.com');
        expect(info.type).toBe(MediaType.Article);
    });

    it('requestItemList should fetch and parse articles', async () => {
        const url = 'new-article';
        const page = 1;
        const list: ExtensionList = await famitsu.requestItemList(url, page);
        expect(list.items.length).toBeGreaterThan(0);
        console.log(list);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
        });
        expect(list.nextPageUrl).toBeDefined();
    }, 30000);

    it('requestItemMedia should fetch and parse article media', async () => {
        // Using a known article for testing
        const url = 'https://www.famitsu.com/article/202512/61584';
        const id = '61584';
        const media: ArticleMedia = await famitsu.requestItemMedia(url, id) as ArticleMedia;
        console.log(media);
        expect(media.content).toBeDefined();
        expect(media.title).toBeDefined();
        expect(media.id).toBe(id);
    }, 30000);
});
