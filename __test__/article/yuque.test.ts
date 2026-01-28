import { RuleJest } from "./../core";
import { MediaType, ArticleMedia } from "@/core/extension";
import Yuque from "@app/article/yuque";

describe("Yuque", () => {
    const yuqueTest = new RuleJest(new Yuque());

    it("should provide extension info", () => {
        const info = yuqueTest.provideExtensionInfo();
        expect(info).toBeDefined();
        expect(info.baseUrl).toBe("https://www.yuque.com");
        expect(info.key).toBe("yuque");
        expect(info.name).toBe("语雀");
        expect(info.type).toBe(MediaType.Article);
    });

    it("should request channel list for a user", async () => {
        const username = "wikidesign";
        const page = 1;
        const list = await yuqueTest.requestChannelList(username, page);

        expect(list.items.length).toBeGreaterThan(0);
        list.items.forEach((item) => {
            expect(item.url).toBeDefined();
            expect(item.title).toBeDefined();
            expect(item.id).toBeDefined();
            expect(item.author).toBe(username);
        });
    }, 10000);

    it("should request item chapter for a book", async () => {
        // Using a known book from the user "yuque"
        const bookId = "1870348"; // "语雀是什么"
        const bookUrl = `https://www.yuque.com/api/docs?book_id=${bookId}`;
        const detail = await yuqueTest.requestItemChapter(bookUrl, bookId);

        console.log("Book detail:", detail);

        expect(detail).toBeDefined();
        expect(detail.title).toBeDefined();
        expect(detail.volumes).toBeDefined();
        expect(detail.volumes?.length).toBeGreaterThan(0);
    }, 10000);

    it("should request item media for a book chapter", async () => {
        // A chapter from the book "语雀是什么"
        const bookId = "1870348";
        const chapterSlug = "bcq95w41i7azflsu";
        const mediaUrl = `https://www.yuque.com/api/docs/${chapterSlug}?book_id=${bookId}`;
        const media = await yuqueTest.requestItemMedia(mediaUrl, chapterSlug) as ArticleMedia;

        console.log("Chapter media:", media);

        expect(media).toBeDefined();
        expect(media.content).toBeDefined();
        expect(media.content).toBeDefined();
        expect(media.title).toBe("雪球｜财富精灵“呦呦”的形象设计");
    }, 10000);

    it.only("should request item media for a user note", async () => {
        // A note from user `yuque`
        const noteSlug = "xeb7xb";
        //https://www.yuque.com/api/docs/ipesh9?book_id=1167441
        const mediaUrl = `https://www.yuque.com/api/docs/${noteSlug}?book_id=555749`;
        const media = await yuqueTest.requestItemMedia(mediaUrl, noteSlug) as ArticleMedia;
        console.log("Note media:", media);

        expect(media).toBeDefined();
        expect(media.content).toBeDefined();
        expect(media.title).toBeDefined();
    }, 10000);
});
