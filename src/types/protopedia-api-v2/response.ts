/**
 * @packageDocumentation
 * API response type definitions for the ProtoPedia v2 endpoints.
 *
 * These interfaces capture the response structures returned by the public
 * ProtoPedia REST API documented at ProtoPedia API Ver 2.0 · Apiary
 * https://protopediav2.docs.apiary.io/#reference/0/0/0
 *
 * @remarks These types are defined based on sampling actual API responses,
 * not the formal API specification. They may need to be updated when the
 * API changes.
 */

/**
 * Raw API v2 response for listing prototypes.
 *
 * ProtoPedia API Ver 2.0 · Apiary
 * https://protopediav2.docs.apiary.io/#reference/0/0/0?console=1
 *
 * @remarks This is defined based on sampling actual data, not the API specification.
 * It may need to be updated when the API specification changes.
 */
export interface ListPrototypesApiResponse {
  metadata: {
    detail: string;
    title: string;
    status: number;
  };
  count: number;
  links: {
    self: {
      href: string;
    };
  };
  /**
   * Does not exist when count is 0
   */
  results?: ResultOfListPrototypesApiResponse[];
}

/**
 * Each item in the `results` array of `ListPrototypesApiResponse`.
 *
 * @remarks
 * This is defined based on sampling actual data, not the API specification.
 * It may need to be updated when the API specification changes.
 *
 * Some fields (releaseDate, teamNm, users, freeComment, thanksFlg) are optional
 * because they are not present in all prototype records returned by the API.
 * Analysis of 5,861 prototypes (IDs 1-7926) shows varying presence rates:
 * - teamNm: 90.77% (542 missing)
 * - thanksFlg: 96.74% (191 missing)
 * - freeComment: 99.47% (31 missing)
 * - releaseDate: 99.68% (19 missing)
 * - users: 99.95% (3 missing)
 *
 * **Confidence Level System**:
 * Each field includes a **Confidence** indicator showing documentation reliability:
 * - **Confirmed**: Documented in official API docs or verified through Edit screen information
 * - **Estimated**: Inferred from data patterns, field names, or Edit screen behavior
 * - **Unknown**: Purpose or exact meaning unclear from available sources
 *
 * Note: ProtoPedia API v2 documentation only defines 4 fields explicitly
 * (licenseType, status, releaseFlg, thanksFlg). Most field descriptions are estimated
 * based on Edit screen labels, data analysis, and common API conventions.
 */
export interface ResultOfListPrototypesApiResponse {
  /**
   * **Confidence**: Estimated
   *
   * Unique prototype ID.
   *
   * This ID corresponds to the numeric identifier in the ProtoPedia URL.
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * id: 1898
   * ```
   */
  id: number;

  /**
   * **Confidence**: Unknown
   *
   * Universal unique identifier.
   *
   * Internal identifier, possibly used by ProtoPedia platform (purpose unknown).
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * uuid: "2a84d7e4-5fe0-418f-b6ec-2ec6574ec56f"
   * ```
   */
  uuid: string;

  /**
   * **Confidence**: Unknown
   *
   * Node identifier.
   *
   * Internal identifier, possibly related to content management system (purpose unknown).
   *
   * **Presence rate**: 32.20% (3,974 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * nid: "2421fcb1263b9530df88f7f002e78ea5"
   * ```
   */
  nid?: string;

  /**
   * **Confidence**: Unknown
   *
   * User ID who created this prototype.
   *
   * **Presence rate**: 67.80% (1,887 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * createId: 123
   * ```
   */
  createId?: number;

  /**
   * **Confidence**: Estimated
   *
   * Creation date.
   *
   * Date and time when the prototype was first created.
   * Timezone is JST (Japan Standard Time, UTC+9) without offset notation.
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * createDate: "2017-11-13 20:23:16.0"
   * ```
   */
  createDate: string;

  /**
   * **Confidence**: Unknown
   *
   * User ID who last updated this prototype.
   *
   * **Presence rate**: 70.60% (1,723 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * updateId: 456
   * ```
   */
  updateId?: number;

  /**
   * **Confidence**: Estimated
   *
   * Last update date.
   *
   * Date and time when the prototype was last modified.
   * Timezone is JST (Japan Standard Time, UTC+9) without offset notation.
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * updateDate: "2018-07-10 16:17:57.0"
   * ```
   */
  updateDate: string;

  /**
   * **Confidence**: Estimated
   *
   * Release date.
   *
   * Date and time when the prototype was published.
   * Timezone is JST (Japan Standard Time, UTC+9) without offset notation.
   *
   * **Presence rate**: 99.68% (19 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * releaseDate: "2017-11-13 20:23:16.0"
   * ```
   */
  releaseDate?: string;

  /**
   * **Confidence**: Confirmed
   *
   * Brief summary/description of the prototype.
   *
   * Concise description or tagline that summarizes the prototype's purpose or appeal.
   *
   * **Presence rate**: 84.63% (901 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * summary: "仕事中のおさぼりから酒宴のつまみにも、寝酒のお供に、気付けば夜更け、朝ぼらけ。"
   * ```
   *
   * **Edit screen**: 概要 (required)
   */
  summary?: string;

  /**
   * **Confidence**: Confirmed
   *
   * Pipe-separated tag names.
   *
   * Programming technologies or keywords representing the prototype.
   *
   * **Presence rate**: 80.45% (1,146 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * tags: "GitHub Copilot|MUGEN|Next.js|ProtoPedia API Ver 2.0|Vercel"
   * ```
   *
   * **Edit screen**: タグ - プログラミング技術や作品を表すタグ、5個程度つけることでより多くの人に見てもらいやすくなります。
   */
  tags?: string;

  /**
   * **Confidence**: Estimated
   *
   * Team name.
   *
   * Name of the team that created this prototype.
   *
   * **Presence rate**: 33.82% (541 missing, 3,338 empty out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * teamNm: "Pizayanz"
   * ```
   */
  teamNm?: string;

  /**
   * **Confidence**: Estimated
   *
   * Pipe-separated user names.
   *
   * Names of users involved in creating this prototype.
   *
   * **Presence rate**: 99.95% (3 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * users: "ひさやん@hisayan"
   * ```
   */
  users?: string;

  /**
   * **Confidence**: Confirmed
   *
   * Development status code.
   *
   * Indicates the development stage of the prototype.
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * status: 2
   * ```
   *
   * **Possible values**:
   * - `1`: 'アイデア' (Idea) - Concept stage
   * - `2`: '開発中' (In Development) - Work in progress
   * - `3`: '完成' (Completed) - Finished prototype
   * - `4`: '供養' (Retired/Memorial) - Discontinued or archived
   *
   * **Edit screen**: 作品ステータス (required) - アイデア / 開発中 / 完成 / 供養
   */
  status: number;

  /**
   * **Confidence**: Confirmed
   *
   * Release flag.
   *
   * Publication status of the prototype. Public API only returns publicly released prototypes.
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * releaseFlg: 2
   * ```
   *
   * **Possible values**:
   * - `1`: '下書き保存' (Draft) - Not accessible via API
   * - `2`: '一般公開' (Public) - Publicly accessible (100% in API)
   * - `3`: '限定共有' (Limited Sharing) - Not accessible via API
   */
  releaseFlg: number;

  /**
   * **Confidence**: Unknown
   *
   * Revision number.
   *
   * Purpose unclear. All prototypes have value `0` (100% of 5,861 prototypes).
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * revision: 0
   * ```
   */
  revision: number;

  /**
   * **Confidence**: Confirmed
   *
   * Prototype name/title.
   *
   * The main title of the prototype.
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * prototypeNm: "無限ProtoPedia"
   * ```
   *
   * **Edit screen**: 作品タイトル (required)
   */
  prototypeNm: string;

  /**
   * **Confidence**: Confirmed
   *
   * Free-form story/description text.
   *
   * Detailed description about the prototype including features, technical highlights, and team messages.
   * Contains HTML (Markdown is converted to HTML).
   *
   * **Presence rate**: 83.65% (31 missing, 927 empty out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * freeComment: "# 無限ProtoPedia<br><br>無限のプロトタイプ。ひらめきは一瞬で。<br><br>..."
   * ```
   *
   * **Edit screen**: ストーリー - Markdown記法やHTMLで入力できます。作品の特徴や技術的こだわりなど、作品について伝えたいことを自由にお書きください。
   */
  freeComment?: string;

  /**
   * **Confidence**: Confirmed
   *
   * Technical system description.
   *
   * Explanation of technical architecture or how the prototype was built.
   * Contains HTML (Markdown is converted to HTML).
   *
   * **Presence rate**: 54.21% (1,723 missing, 961 empty out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * systemDescription: "Access Modes:<br><br>- Web Browser: 標準アクセス<br>- PWA App: インストール済み<br>..."
   * ```
   *
   * **Edit screen**: システム構成 - どうやって作ったかを画像、Markdown記法やHTMLで解説ください。
   */
  systemDescription?: string;

  /**
   * **Confidence**: Confirmed
   *
   * Video URL.
   *
   * YouTube or Vimeo URL showcasing the prototype.
   *
   * **Presence rate**: 63.91% (998 missing, 1,117 empty out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * videoUrl: "https://youtu.be/hDv-pdD1PUY?si=OBIVx2d16J2sNgV1"
   * ```
   *
   * **Edit screen**: 動画 - YouTube、もしくはVimeoのURLを入力ください。
   */
  videoUrl?: string;

  /**
   * **Confidence**: Confirmed
   *
   * Main image URL.
   *
   * URL of the eyecatch/thumbnail image, typically hosted on ProtoPedia's CDN.
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * mainUrl: "https://protopedia.net/pic/a1cfe820-a8cc-40b5-9242-9fd0c4738743.png"
   * ```
   *
   * **Edit screen**: 画像 / アイキャッチ画像 - Up to 5 images can be registered; the 1st image becomes the main image.
   */
  mainUrl: string;

  /**
   * **Confidence**: Estimated
   *
   * Pipe-separated award names.
   *
   * Awards or recognitions received by this prototype.
   *
   * **Presence rate**: 10.68% (5,235 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * awards: "Best Hack Award|Audience Award"
   * ```
   */
  awards?: string;

  /**
   * **Confidence**: Estimated
   *
   * View count.
   *
   * Number of times this prototype has been viewed.
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * viewCount: 353
   * ```
   */
  viewCount: number;

  /**
   * **Confidence**: Estimated
   *
   * Good count.
   *
   * Number of "good" (likes) received.
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * goodCount: 42
   * ```
   */
  goodCount: number;

  /**
   * **Confidence**: Estimated
   *
   * Comment count.
   *
   * Number of comments received on this prototype.
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * commentCount: 5
   * ```
   */
  commentCount: number;

  /**
   * **Confidence**: Confirmed
   *
   * First related link URL.
   *
   * Related resources such as GitHub repository, blog posts, or documentation.
   *
   * **Presence rate**: 28.82% (1,723 missing, 2,449 empty out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * relatedLink: "https://github.com/F88/mugen-protopedia"
   * ```
   *
   * **Edit screen**: 関連リンク - この作品に関係の深いページ(技術ブログ、イベントブログ、受賞記事、関連作品など)あれば入力ください。
   */
  relatedLink?: string;

  /**
   * **Confidence**: Confirmed
   *
   * Second related link URL.
   *
   * @see {@link relatedLink} for details
   *
   * **Presence rate**: 15.24% (2,038 missing, 2,930 empty out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * relatedLink2: "https://protopedia.net/"
   * ```
   */
  relatedLink2?: string;

  /**
   * **Confidence**: Confirmed
   *
   * Third related link URL.
   *
   * @see {@link relatedLink} for details
   *
   * **Presence rate**: 8.07% (2,038 missing, 3,350 empty out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * relatedLink3: "https://protopediav2.docs.apiary.io/"
   * ```
   */
  relatedLink3?: string;

  /**
   * **Confidence**: Confirmed
   *
   * Fourth related link URL.
   *
   * @see {@link relatedLink} for details
   *
   * **Presence rate**: 3.98% (2,038 missing, 3,590 empty out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * relatedLink4: "https://protopedia.net/prototype/7627"
   * ```
   */
  relatedLink4?: string;

  /**
   * **Confidence**: Confirmed
   *
   * Fifth related link URL.
   *
   * @see {@link relatedLink} for details
   *
   * **Presence rate**: 1.93% (2,038 missing, 3,710 empty out of 5,861 prototypes)
   */
  relatedLink5?: string;

  /**
   * **Confidence**: Confirmed
   *
   * License type code.
   *
   * Creative Commons license display preference.
   *
   * **Presence rate**: 100% (0 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * licenseType: 1
   * ```
   *
   * **Possible values**:
   * - `0`: 'なし' (None) - No license display (not observed in API)
   * - `1`: '表示(CC:BY)' - Creative Commons Attribution license (100% in API)
   *
   * **Edit screen**: ライセンスの設定 - 表示する / 表示しない (※2022/5/23からライセンス表記が義務化されました。)
   */
  licenseType: number;

  /**
   * **Confidence**: Confirmed
   *
   * Thanks flag.
   *
   * Controls the "Thank you for posting" message display.
   *
   * **Presence rate**: 96.74% (191 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * thanksFlg: 1
   * ```
   *
   * **Possible values**:
   * - `0`: Message not yet shown (rare in API)
   * - `1`: '初回表示済' - Message already displayed
   */
  thanksFlg?: number;

  /**
   * **Confidence**: Estimated
   *
   * Pipe-separated event names.
   *
   * Events this prototype participated in or was featured in, format: `"EventName@eventId"`.
   *
   * **Presence rate**: 54.80% (2,649 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * events: "ヒーローズ・リーグ 2025@hl2025|ProtoPediaの時間:紹介作品①@protopedia-time50"
   * ```
   */
  events?: string;

  /**
   * **Confidence**: Confirmed
   *
   * Official project URL.
   *
   * Main URL where the prototype can be accessed or used.
   *
   * **Presence rate**: 49.84% (1,016 missing, 1,924 empty out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * officialLink: "https://mugen-pp.vercel.app/"
   * ```
   *
   * **Edit screen**: 作品のURL
   */
  officialLink?: string;

  /**
   * **Confidence**: Confirmed
   *
   * Pipe-separated material/tool names.
   *
   * Development materials, tools, libraries, APIs, and platforms used to build the prototype.
   *
   * **Presence rate**: 76.88% (1,355 missing out of 5,861 prototypes)
   *
   * @example
   * ```typescript
   * materials: "Next.js|ProtoPedia API Ver 2.0|Vercel"
   * ```
   *
   * **Edit screen**: 開発素材 - 使用するAPI、ツール、デバイスなどを3文字以上入力し、候補から選択ください。
   */
  materials?: string;

  /**
   * **Confidence**: Unknown
   *
   * Slide mode flag.
   *
   * Internal display mode flag used by ProtoPedia platform.
   *
   * **Presence rate**: 68.93% (1,821 missing out of 5,861 prototypes)
   *
   * **Value distribution**:
   * - `1`: 3,083 prototypes (52.6%) - Most common
   * - `0`: 957 prototypes (16.3%)
   * - `null`: 1,821 prototypes (31.1%) - Missing
   *
   * @example
   * ```typescript
   * slideMode: 1
   * ```
   */
  slideMode?: number;
}
