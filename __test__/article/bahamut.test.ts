import { ExtensionList, ArticleMedia, MediaType } from '@/core/extension';
import { RuleJest } from "./../core";
import Bahamut from "@app/article/bahamut";

describe('Bahamut', () => {
    const bahamut = new RuleJest(new Bahamut());


    it('requestItemList should fetch and parse articles', async () => {
        const url = 'k=2';
        const page = 1;
        const list: ExtensionList = await bahamut.requestItemList(url, page);
        expect(list.items.length).toBeGreaterThan(0);
        console.log(list);
        list.items.forEach(item => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
        });
        expect(list.nextPageUrl).toBeDefined();
    }, 30000);


});