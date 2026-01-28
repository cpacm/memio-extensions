import { Rule } from '@/core/rule';
import { ExtensionList, ExtensionDetail, ExtensionMedia, Extension, SiteUrl, PictureMedia, MediaType, ExtensionAuth, SiteHeader, ChannelType, Channel } from '@/core/extension';

class Pixiv extends Rule {

    provideExtensionInfo(): Extension {
        let site = new Extension("pixiv", "Pixiv", MediaType.Picture);
        site.baseUrl = "https://www.pixiv.net";
        site.description = "pixiv(ピクシブ)は、作品の投稿・閲覧が楽しめる「イラストコミュニケーションサービス」です。幅広いジャンルの作品が投稿され、ユーザー発の企画やメーカー公認のコンテストが開催されています。";
        site.thumbnail = "https://www.pixiv.net/favicon.ico";
        site.lang = "ja";
        site.categoryList = [
            new SiteUrl("Ranking - デイリー", "daily"),
            new SiteUrl("Ranking - ウィークリー", "weekly"),
            new SiteUrl("Ranking - マンスリー", "monthly"),
            new SiteUrl("Ranking - ルーキー", "rookie"),
            new SiteUrl("Ranking - オリジナル", "original"),
            new SiteUrl("Ranking - AI生成", "daily_ai"),
            new SiteUrl("Ranking - 男性に人気", "male"),
            new SiteUrl("Ranking - 女性に人気", "female"),
            new SiteUrl("Ranking - デイリー R18", "daily_r18"),
            new SiteUrl("Ranking - ウィークリー R18", "weekly_r18"),
            new SiteUrl("Ranking - AI生成 R18", "daily_r18_ai"),
            new SiteUrl("Ranking - 男性に人気 R18", "male_r18"),
            new SiteUrl("Ranking - 女性に人気 R18", "female_r18")
        ];
        site.imageRefer = "https://www.pixiv.net/";

        site.forceLogin = false;
        site.loginParams = [
            { key: "Cookie", value: "Cookie Value" },
        ]
        site.searchList = [
            new SiteUrl("作品を検索", "s_tag"),
        ];

        site.channel = new Channel(ChannelType.List, "ユーザー IDを指定してください。例: 12345678", "ユーザー");

        site.useGuide = ` ## Pixiv(ピクシブ) ログインCookie取得ガイド

1. [Pixiv公式サイト](https://www.pixiv.net)にアクセスし、アカウントを登録します。
2. ログイン後、ブラウザの開発者ツールを開きます（通常はF12キーを押すか、右クリックして「検証」を選択します）。
3. 開発者ツールで、「ネットワーク」（Network）タブを見つけます。
4. ページを更新し、ネットワークリクエストのリストからpixiv.netへのリクエストを見つけてクリックします。
5. リクエスト詳細で、「ヘッダー」（Headers）セクションを見つけ、下にスクロールして「リクエストヘッダー」（Request Headers）を探します。
6. 「Cookie」フィールドの値をコピーします。通常はPHPSESSIDの値だけで十分です。
7. 拡張機能のログイン設定ページに戻り、コピーしたCookieの値を「Cookie Value」フィールドに貼り付けます。
8. 設定を保存すると、ログインが必要なコンテンツにアクセスできるようになります。

注意：Cookieは期限切れになることがありますので、継続的なアクセスを確保するために定期的に更新してください。

## ユーザー IDの取得方法

1. Pixivのユーザープロフィールページにアクセスします。
2. URLの形式は通常 *https://www.pixiv.net/users/12345678* となっており、**12345678** の部分がユーザーIDです。
3. このユーザーIDを拡張機能のチャンネル設定に入力してください。
        `;
        return site;
    }

    override async loginForm(form: Map<string, string>): Promise<ExtensionAuth> {
        let cookie = form.get("Cookie");
        if (!cookie || cookie.trim().length == 0) {
            return new ExtensionAuth();
        }

        let auth = new ExtensionAuth();
        auth.headers.push(new SiteHeader("Cookie", cookie.trim()));
        return auth;
    }

    override async requestItemList(url: string, page: number): Promise<ExtensionList> {
        // https://www.pixiv.net/ranking.php?mode=weekly_r18&content=all&format=json&p=1
        var realUrl = this.site.baseUrl + "/ranking.php?content=all&format=json&mode=" + url + "&p=" + page;
        let nextUrl = this.site.baseUrl + "/ranking.php?content=all&format=json&mode=" + url + "&p=" + (page + 1);
        var jsonResponse = await this.client?.request(
            { url: realUrl, method: "GET" });
        var json = JSON.parse(jsonResponse.body);
        if (!json || !json.contents) {
            return new ExtensionList([], page ? page : 1, undefined);
        }
        var items: ExtensionDetail[] = [];
        json.contents.forEach((element: any) => {
            if (element.illust_id === undefined) {
                return;
            }
            let id = element.illust_id.toString();
            let link = "/artworks/" + id;
            let date = element.date;
            let title = element.title;
            let cover = element.url;
            let author = element.user_name;
            let tags = element.tags.toString();
            let item = new ExtensionDetail(id, this.site.baseUrl + link, title);
            item.thumbnail = cover;
            item.description = tags;
            item.status = date;
            item.author = author;
            item.type = MediaType.Picture;
            items.push(item);
        });

        let hasMore = page < 10;
        return new ExtensionList(items, page, hasMore ? nextUrl : undefined);
    }

    channelMap: Map<string, string[]> = new Map<string, string[]>();

    override async requestChannelList(key: string, page: number): Promise<ExtensionList> {
        //https://www.pixiv.net/ajax/user/68480688/profile/all?sensitiveFilterMode=userSetting&lang=ja

        let illustIds = this.channelMap.get(key);
        if (!illustIds) {
            let channelUrl = this.site.baseUrl + "/ajax/user/" + key + "/profile/all?sensitiveFilterMode=userSetting&lang=ja";
            var jsonResponse = await this.client?.request(
                { url: channelUrl, method: "GET" });

            var json = JSON.parse(jsonResponse.body);
            if (!json || json.error) {
                return new ExtensionList([], page ? page : 1, undefined);
            }

            let illusts = json.body.illusts;
            const ids = Object.keys(illusts);
            this.channelMap.set(key, ids);
            illustIds = ids;
        }

        console.log(`Total illustrations for user ${key}: ${illustIds}`);
        const pageSize = 50;
        const startIndex = (page - 1) * pageSize;
        let endIndex = startIndex + pageSize;
        if (endIndex > illustIds.length) {
            endIndex = illustIds.length;
        }
        if (startIndex >= endIndex) {
            return new ExtensionList([], page ? page : 1, undefined);
        }
        const pagedIds = illustIds.slice(startIndex, endIndex);

        // https://www.pixiv.net/ajax/user/109083427/illusts?
        let params = pagedIds.map(id => "ids%5B%5D=" + id).join("&");
        let requestUrl = this.site.baseUrl + "/ajax/user/" + key + "/illusts?" + params;

        var pageResponse = await this.client?.request(
            { url: requestUrl, method: "GET" });

        var pageJson = JSON.parse(pageResponse.body);
        if (!pageJson || pageJson.error) {
            return new ExtensionList([], page ? page : 1, undefined);
        }

        var items: ExtensionDetail[] = [];
        pagedIds.forEach((id: string) => {
            const element = pageJson.body[id];
            console.log('element:', element);
            if (element === undefined) {
                return;
            }
            let link = this.site.baseUrl + "/artworks/" + id;
            let title = element.title;
            let cover = element.url;
            let author = element.userName;
            let illustType = element.illustType;
            let illustTypeTxt = "イラスト"
            if (illustType === 0) illustTypeTxt = "イラスト";
            else if (illustType === 1) illustTypeTxt = "マンガ";
            else illustTypeTxt = "アニメーション";

            let restrict = element.restrict;
            let restrictTxt = "一般";
            if (restrict === 0) restrictTxt = "一般";
            else if (restrict === 1) restrictTxt = "R-18";
            else restrictTxt = "R-18G";

            let pageCount = element.pageCount;
            let tags = element.tags.toString();
            let item = new ExtensionDetail(id, link, title);
            item.thumbnail = cover;
            item.description = tags;
            item.status = pageCount > 1 ? `全${pageCount}枚` : "単一画像";
            item.author = author;
            item.type = MediaType.Picture;
            item.category = illustTypeTxt + " - " + restrictTxt;

            items.push(item);
        });

        let hasMore = endIndex < illustIds.length;
        return new ExtensionList(items, page ? page : 1, hasMore ? key : undefined);

    }

    override async searchItemList(keyword: string, url: string, page: number): Promise<ExtensionList> {
        // https://www.pixiv.net/ajax/search/artworks/%E3%83%AA%E3%82%BC%E3%83%AD?word=%E3%83%AA%E3%82%BC%E3%83%AD&order=date_d&mode=all&p=1&csw=0&s_mode=s_tag_full&type=all&lang=ja

        let searchApi = this.site.baseUrl + "/ajax/search/artworks/" + encodeURIComponent(keyword) +
            `?word=${encodeURIComponent(keyword)}&order=date_d&mode=all&p=${page}&csw=0&s_mode=s_tag_full&type=all&lang=ja`;
        let nextUrl = this.site.baseUrl + "/ajax/search/artworks/" + encodeURIComponent(keyword) +
            `?word=${encodeURIComponent(keyword)}&order=date_d&mode=all&p=${page + 1}&csw=0&s_mode=s_tag_full&type=all&lang=ja`;

        var jsonResponse = await this.client?.request(
            { url: searchApi, method: "GET" });
        var json = JSON.parse(jsonResponse.body);
        if (!json || json.error) {
            return new ExtensionList([], page ? page : 1, undefined);
        }
        var items: ExtensionDetail[] = [];

        let illusts = json.body.illustManga.data;
        illusts.forEach((element: any) => {
            if (element.id === undefined) {
                return;
            }
            let id = element.id;
            let link = this.site.baseUrl + "/artworks/" + id;
            let title = element.title;
            let cover = element.url;
            let author = element.userName;
            let illustType = element.illustType;
            let illustTypeTxt = "イラスト"
            if (illustType === 0) illustTypeTxt = "イラスト";
            else if (illustType === 1) illustTypeTxt = "マンガ";
            else illustTypeTxt = "アニメーション";

            let restrict = element.restrict;
            let restrictTxt = "一般";
            if (restrict === 0) restrictTxt = "一般";
            else if (restrict === 1) restrictTxt = "R-18";
            else restrictTxt = "R-18G";

            let pageCount = element.pageCount;
            let tags = element.tags.toString();
            let item = new ExtensionDetail(id, link, title);
            item.thumbnail = cover;
            item.description = tags;
            item.status = pageCount > 1 ? `全${pageCount}枚` : "単一画像";
            item.author = author;
            item.type = MediaType.Picture;
            item.category = illustTypeTxt + " - " + restrictTxt;
            items.push(item);
        });

        let lastPage = json.body.illustManga.lastPage;
        let hasMore = page < lastPage;
        return new ExtensionList(items, page, hasMore ? nextUrl : undefined);
    }

    override async requestItemMedia(url: string, id: string): Promise<ExtensionMedia> {
        var realUrl = this.site.baseUrl + "/ajax/illust/" + id + "/pages";

        var jsonResponse = await this.client?.request(
            { url: realUrl, method: "GET" });
        var json = JSON.parse(jsonResponse.body);
        if (!json || !json.body) {
            return new PictureMedia("-1", "", []);
        }

        let urls: string[] = [];
        let nodes = json.body;
        nodes.forEach((element: any) => {
            let imageUrl = element.urls.regular;
            urls.push(imageUrl);
        });
        let media = new PictureMedia(id, "", urls);
        media.refer = this.site.imageRefer;

        return media;
    }

}

(function () {
    const pixiv = new Pixiv();
    pixiv.init();
})();

export default Pixiv;