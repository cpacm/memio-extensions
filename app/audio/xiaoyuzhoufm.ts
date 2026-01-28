import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, AudioMedia, SiteHeader, ChannelType, Channel } from '@/core/extension';

class XiaoYuZhouFm extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("xiaoyuzhoufm", "小宇宙", MediaType.Audio);
        site.baseUrl = "https://www.xiaoyuzhoufm.com";
        site.description = "小宇宙 - 最受欢迎的播客 APP，海量优质播客节目，随时随地收听。";
        site.thumbnail = "https://www.xiaoyuzhoufm.com/favicon.ico";
        site.lang = "zh";
        site.categoryList = [];
        site.channel = new Channel(ChannelType.List, "播客频道ID", "podcast");
        site.useGuide = `## 如何找到播客频道ID

1. 打开小宇宙 App，搜索并进入您感兴趣的播客节目页面，点击右上角的“分享”按钮。
2. 在分享选项中，选择“复制链接”以获取该播客节目的链接地址。
3. 将复制的链接粘贴到浏览器地址栏中，链接格式通常为 \`https://www.xiaoyuzhoufm.com/podcast/123356fhdas\`，其中的 \`123356fhdas\` 就是该播客的频道ID。
4. 将该频道ID复制并粘贴到本扩展的频道ID输入框中，即可订阅该播客节目。

> 注意：播客频道只能获取最新的15条节目。
`;
        return site;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        return new ExtensionList([], page, undefined);
    }

    searchHtmlScriptElement(html: string): string {
        let $nodes = $(html);
        let jsonString = "";
        $nodes.each((index, element) => {
            if (element instanceof HTMLScriptElement) {
                if (element.id === "__NEXT_DATA__") {
                    let scriptContent = element.innerHTML;
                    jsonString = scriptContent;
                    return false; // Exit the each loop
                }
            }
        });
        return jsonString;
    }

    override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        let url = `https://www.xiaoyuzhoufm.com/podcast/${key}`;
        let response = await this.client?.request({ url: url, method: "GET" });
        let html = response.body;
        let jsonString = this.searchHtmlScriptElement(html);

        let eps: ExtensionDetail[] = [];
        try {
            let jsonData = JSON.parse(jsonString);
            let podcastData = jsonData.props.pageProps.podcast;
            let episodes = podcastData.episodes;
            let podcastCover = podcastData.image?.thumbnailUrl ?? podcastData.image?.picUrl ?? "";
            let author = podcastData.author;
            let category = podcastData.title;
            episodes.forEach((ep: any) => {
                let id = ep.eid;
                let title = ep.title;
                let url = `https://www.xiaoyuzhoufm.com/episode/${id}`;
                let description = ep.description || "";
                let status = ep.status || "" + "|" + ep.payType || "";
                let cover = ep.image?.thumbnailUrl ?? ep.image?.picUrl ?? podcastCover;
                let episode = new ExtensionDetail(id, url, title);
                episode.author = author;
                episode.description = description;
                episode.status = status;
                episode.hasChapter = false;
                episode.thumbnail = cover;
                episode.type = MediaType.Audio;
                episode.category = category;
                eps.push(episode);
            });
        } catch (error) {
            console.error("Failed to parse JSON data:", error);
            return new ExtensionList([], page, undefined);
        }
        return new ExtensionList(eps, page, undefined);
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        let apiUrl = `https://www.xiaoyuzhoufm.com/episode/${id}`;
        let response = await this.client?.request({ url: apiUrl, method: "GET" });
        let html = response.body;
        let jsonString = this.searchHtmlScriptElement(html);

        try {
            let jsonData = JSON.parse(jsonString);
            let episodeData = jsonData.props.pageProps.episode;
            let title = episodeData.title;
            let cover = episodeData.image.thumbnailUrl ?? episodeData.image.picUrl ?? "";
            let duration = episodeData.duration ?? 0;
            let audioUrl = episodeData.media.source.url ?? "";
            let artist = episodeData.podcast.author ?? "";
            let media = new AudioMedia(id, title, audioUrl, duration, artist, cover);
            return media;

        } catch (error) {
            console.error("Failed to parse JSON data:", error);
            return new AudioMedia("-1", "", "");
        }
    }
}


(function () {
    const xiaoyuzhoufm = new XiaoYuZhouFm();
    xiaoyuzhoufm.init();
})();

export default XiaoYuZhouFm;