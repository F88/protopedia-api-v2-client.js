/**
 * Raw API v2 response for listing prototypes.
 *
 * ProtoPedia API Ver 2.0 · Apiary
 * https://protopediav2.docs.apiary.io/#reference/0/0/0?console=1
 *
 * @remarks APIで定義された仕様ではなく、実際のデータをサンプリングした結果を基に定義した内容である。
 * APIにおいて仕様変更が発生した際などは発生対応する必要がある。
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
   * 0件の場合は存在しない
   */
  results?: ResultOfListPrototypesApiResponse[];
}

/**
 * Each item in the `results` array of `ListPrototypesApiResponse`.
 *
 * @remarks APIで定義された仕様ではなく、実際のデータをサンプリングした結果を基に定義した内容である。
 * APIにおいて仕様変更が発生した際などは発生対応する必要がある。
 */
export interface ResultOfListPrototypesApiResponse {
  // ids
  id: number;
  uuid: string;
  nid?: string;

  createId?: number;
  createDate: string;
  updateId?: number;
  updateDate: string;
  releaseDate?: string;

  summary?: string;
  tags?: string;

  // team
  teamNm?: string;
  users?: string;

  status: number;
  releaseFlg: number;

  // prototype
  revision: number;
  prototypeNm: string;
  freeComment?: string;
  systemDescription?: string;
  videoUrl?: string;

  mainUrl: string;

  // award
  awards?: string;

  // counts
  viewCount: number;
  goodCount: number;
  commentCount: number;

  // link
  relatedLink?: string;
  relatedLink2?: string;
  relatedLink3?: string;
  relatedLink4?: string;
  relatedLink5?: string;

  // license
  licenseType: number;

  // thanksFlg
  thanksFlg?: number;

  // event
  events?: string;
  officialLink?: string;
  materials?: string;

  // slide mode
  slideMode?: number;
}
