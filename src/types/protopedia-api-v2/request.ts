/**
 * @packageDocumentation
 * API request parameter definitions for the ProtoPedia v2 endpoints.
 *
 * These interfaces capture the supported query parameters and payload
 * structures accepted by the public ProtoPedia REST API documented at
 * ProtoPedia API Ver 2.0 · Apiary
 * https://protopediav2.docs.apiary.io/#reference/0/0/0
 */

/**
 * @deprecated Use `ListPrototypesParams` instead.
 */
export interface ListPrototypesParams_Old {
  keyword?: string;
  tag?: string;
  series?: string;
  hardwareId?: number;
  softwareId?: number;
  page?: number;
  perPage?: number;
  order?: 'asc' | 'desc';
  sort?: 'created_at' | 'updated_at' | 'likes';
  since?: string;
  until?: string;
  ids?: number[];
  includeMembers?: boolean;
  includeLinks?: boolean;
}

/**
 * Query parameters for listing prototypes.
 *
 * ProtoPedia API Ver 2.0 · Apiary
 * https://protopediav2.docs.apiary.io/#reference/0/0/0
 *
 * | Parameters | Desc | Type |
 * | --- | --- | --- |
 * | userNm | ユーザー名によるフィルタ | String |
 * | materialNm | 素材名によるフィルタ | String |
 * | tagNm | タグ名によるフィルタ | String |
 * | eventNm | イベント名によるフィルタ | String |
 * | eventId | 特定のイベントID | Integer |
 * | awardNm | 受賞名によるフィルタ | String |
 * | prototypeId | 特定のプロトタイプID | Integer |
 * | status | ステータスコード | Integer |
 * | limit | 取得するプロトタイプの最大数 | Integer |
 * | offset | 取得開始位置 | Integer |
 *
 * @example
 * // Fetch prototypes by a specific user, tagged with "IoT", first page
 * const params: ListPrototypesParams = {
 *   userNm: "alice",
 *   tagNm: "IoT",
 *   limit: 20,
 *   offset: 0,
 * };
 */
export interface ListPrototypesParams {
  /**
   * Filter by user name (creator/owner display name).
   */
  userNm?: string;
  /**
   * Filter by material name.
   */
  materialNm?: string;
  /**
   * Filter by tag name.
   */
  tagNm?: string;
  /**
   * Filter by event name.
   */
  eventNm?: string;
  /**
   * Filter by a specific event identifier.
   */
  eventId?: number;
  /**
   * Filter by award name (e.g., prize or recognition title).
   */
  awardNm?: string;
  /**
   * Filter by a specific prototype identifier.
   */
  prototypeId?: number;
  /**
   * Filter by status code. The set of valid codes is defined by the API.
   */
  status?: number;
  /**
   * Maximum number of items to return.
   */
  limit?: number;
  /**
   * Zero-based index of the first item to return (for pagination).
   */
  offset?: number;
}
