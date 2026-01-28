import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, MediaType, AudioMedia } from '@/core/extension';

class DianTaiWang extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("diantaiwang", "电台网", MediaType.Audio);
        site.baseUrl = "https://www.diantaiwang.com";
        site.description = "在线电台网 - 网络广播电台免费收听丨电台之家提供电台广播节目、资讯，倾力打造大家喜欢的网络收音机视听平台！"
        site.thumbnail = "https://www.diantaiwang.com/imgs/favicon.ico";
        site.lang = "zh";
        site.categoryList = [
            new SiteUrl("综合", "/zonghe/"),
            new SiteUrl("新闻", "/xinwen/"),
            new SiteUrl("经济", "/jingji/"),
            new SiteUrl("音乐", "/yinyue/"),
            new SiteUrl("交通", "/jiaotong/"),
            new SiteUrl("都市", "/dushi/"),
            new SiteUrl("生活", "/shenghuo/"),
            new SiteUrl("文艺", "/wenyi/"),
            new SiteUrl("戏曲", "/xiqu/"),
            new SiteUrl("健康", "/jiankang/"),
            new SiteUrl("娱乐", "/yule/"),
            new SiteUrl("教育", "/jiaoyu/"),
            new SiteUrl("资讯", "/zixun/"),
            new SiteUrl("体育", "/tiyu/"),
            new SiteUrl("旅游", "/luyou/"),
            new SiteUrl("农村", "/nongcun/"),
            new SiteUrl("故事", "/gushi/"),
            new SiteUrl("评书", "/pingshu/"),
            new SiteUrl("外语", "/waiyu/"),
        ];
        site.searchList = [];
        return site;
    }
    async requestItemList(url: string, page: number): Promise<ExtensionList> {
        var realUrl = this.site.baseUrl + url;
        var htmlResponse = await this.client?.request(
            {
                url: realUrl,
                method: "GET",
                headers: [
                    { key: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36" },
                ],
                responseCharset: "gb2312",
            });
        var html = htmlResponse.body;
        let $nodes = $(html).filter("div.content");
        var listNode = $nodes.find("li");
        if (!listNode || listNode.length == 0) {
            return new ExtensionList([], page ? page : 1, undefined);
        }

        var items: ExtensionDetail[] = [];
        listNode.each((_index, element) => {
            let ele = $(element);
            let link = ele.find("a").attr("href");
            if (link) {
                let title = ele.find("a").text();
                let pattern = new RegExp('/fm/(.*?).html', 'i');
                let id = pattern.exec(link!)?.[1];
                let item = new ExtensionDetail(id!, link.replace("fm", "radio"), title);
                item.type = MediaType.Audio;
                items.push(item);
            }
        });
        return new ExtensionList(items, page, undefined);
    }


    async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        var realUrl = this.site.baseUrl + url;
        var htmlResponse = await this.client?.request(
            {
                url: realUrl,
                method: "GET",
                headers: [
                    { key: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/244.178.44.111 Safari/537.36" },
                ],

            });
        var html = htmlResponse.body;
        let mediaUrl = $(html).filter("audio").attr("src");
        let media = new AudioMedia(id, "", mediaUrl??"", -1, "");
        return media;
    }

}

(function () {
    const diantai = new DianTaiWang();
    diantai.init();
})();

export default DianTaiWang;