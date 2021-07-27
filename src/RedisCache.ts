import { CoaContextError, CoaError } from 'coa-error'
import { _ } from 'coa-helper'
import { RedisBin } from './RedisBin'
import { CoaRedis, Redis } from './typings'

export class RedisCache {
  private readonly io: Redis.Redis
  private readonly config: CoaRedis.Config

  constructor(bin: RedisBin) {
    this.io = bin.io
    this.config = bin.config
  }

  /**
   * 设置一个值
   * @param id 键
   * @param value 值
   * @param ms 生存时间，毫秒
   * @returns
   */
  async set(id: string, value: any, ms: number = this.config.ttl) {
    ms > 0 || CoaError.throw('RedisCache.InvalidParam', 'cache set ms 必须大于0')
    return await this.io.set(this.key(id), this.encode(value), 'PX', ms)
  }

  /**
   * 批量设置
   * @param values 一个健值对的对象
   * @param ms 生存时间，毫秒
   * @returns
   */
  async mSet(values: CoaRedis.Dic<any>, ms: number = this.config.ttl) {
    ms > 0 || CoaError.throw('RedisCache.InvalidParam', 'cache hash ms 必须大于0')
    const pipeline = this.io.pipeline()
    _.forEach(values, (value, id) => {
      pipeline.set(this.key(id), this.encode(value), 'PX', ms)
    })
    pipeline.length > 0 || CoaError.throw('RedisCache.InvalidParam', 'cache mSet values值的数量 必须大于0')
    return await pipeline.exec()
  }

  // 获取
  async get(id: string) {
    return this.decode(await this.io.get(this.key(id)))
  }

  // 批量获取
  async mGet(ids: string[]) {
    const ret = await this.io.mget(...ids.map((id) => this.key(id)))
    const result: CoaRedis.Dic<any> = {}
    _.forEach(ids, (id, index) => (result[id] = this.decode(ret[index])))
    return result
  }

  // 获取
  async warp<T>(id: string, worker: () => Promise<T>, ms = this.config.ttl, force = false) {
    let result = force ? undefined : await this.get(id)
    if (result === undefined) {
      result = await worker()
      ms > 0 && (await this.set(id, result, ms))
    }
    return result as T
  }

  // 获取
  async mWarp<T>(ids: string[], worker: (ids: string[]) => Promise<T>, ms = this.config.ttl, force = false) {
    // 尝试从缓存中获取数据，如果force则固定为空
    const result = force ? {} : await this.mGet(ids)

    // 筛选出没有缓存的ID
    const dataIds = [] as string[]
    _.forEach(ids, (id) => {
      if (result[id] === undefined) dataIds.push(id)
    })

    if (dataIds.length) {
      // 通过worker获取数据
      const dataResult = (await worker(dataIds)) as any
      // 如果没有获取到结果，则设置为null
      _.forEach(dataIds, (id) => {
        if (dataResult[id] === undefined) dataResult[id] = null
      })
      // 如果有缓存时间，则保存一遍
      if (ms > 0) {
        await this.mSet(dataResult, ms)
      }
      // 将新的结果附加到最终结果里面
      _.assign(result, dataResult)
    }

    return result
  }

  // 删除
  async delete(ids: string[] = []) {
    return await this.io.del(...ids.map((id) => this.key(id)))
  }

  // 清除指定前缀的缓存
  async clear(prefix: string = '') {
    const keys = await this.io.keys(this.key(prefix + '*'))
    return keys.length ? await this.io.del(...keys) : 0
  }

  // 设置key
  public key(id: string) {
    return (this.config.prefix + ':' + id).toLowerCase()
  }

  protected encode(value: any) {
    if (value === undefined) value = null
    return JSON.stringify([value])
  }

  protected decode(value: string | null) {
    if (!value) return undefined
    try {
      const [data] = JSON.parse(value)
      return data
    } catch (e) {
      return undefined
    }
  }
}
